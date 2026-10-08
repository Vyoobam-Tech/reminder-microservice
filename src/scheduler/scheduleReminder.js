import cron from "node-cron";
import moment from "moment-timezone";
import Reminder from "../models/Reminder.js";
import DeliveryLog from "../models/DeliveryLog.js";
// import { deliver } from "../services/deliveryService.js";
import { runAttempt } from "../services/deliveryRunner.js";
import { startRetryWorker } from "./retryDeliveries.js";

// Scheduler epdi work aagum
// ------------------------
// Ovvoru reminder-kum `nextRunAt` irukku. Cron ovvoru nimishamum ஓடi, due aana
// active reminders-a edukkum, `nextRunAt`-a atomic-ah munnadi thalli "claim" pannum,
// appuram send pannum. State Mongo-la irukkradhala restart-la reminder lost/duplicate aagaadhu.

const DEFAULT_TZ = "Asia/Kolkata";

const RECURRENCE_UNITS = {
  Daily: "days",
  Weekly: "weeks",
  Monthly: "months",
  Yearly: "years",
};

/**
 * `after`-ku apram varra first occurrence. Illa na null (one-time & past).
 * Original date-la irundhu count pannum, so 31st maasam maasam 28th-ku drift aagaadhu.
 */
export const computeNextRun = (reminder, after = new Date()) => {
  if (!reminder?.scheduledAt) return null;
  const anchor = new Date(reminder.scheduledAt);
  if (isNaN(anchor)) return null;
  if (anchor >= after) return anchor;

  const unit = RECURRENCE_UNITS[reminder.recurrence];
  if (!unit) return null; // One-time and already past

  const tz = reminder.timezone || DEFAULT_TZ;
  const base = moment.tz(anchor, tz);
  let k = Math.max(0, Math.floor(moment.tz(after, tz).diff(base, unit, true)));
  let next = base.clone().add(k, unit);
  while (next.toDate() < after) {
    k += 1;
    next = base.clone().add(k, unit);
  }
  return next.toDate();
};

/**
 * Reminder-a ovvoru channel vazhiyum anuppi DeliveryLog ezhudhum.
 * Oru channel fail aanalum matradhu thodarum.
 */
export const triggerReminder = async (reminder, { trigger = "scheduled", occurrence, channels } = {}) => {
  let sent = 0;
  let failed = 0; // retrying-um idhula serum

  for (const channel of channels || reminder.channels) {
    const to = channel === "email" ? reminder.recipient.email : reminder.recipient.phone;
    if (!to) continue;

    // Send panra MUNNADI pending log create: crash aanalum record irukkum
    let log;
    try {
      log = await DeliveryLog.create({
        reminderId: reminder._id,
        applicationId: reminder.applicationId,
        tenantId: reminder.tenantId,
        channel,
        to,
        status: "pending",
        attempt: 1,
        trigger,
        occurrence: occurrence || reminder.scheduledAt,
      });
    } catch (e) {
      console.error(`❌ Could not create delivery log (${channel}):`, e.message);
      failed++;
      continue;
    }

    const result = await runAttempt(log, reminder);
    if (result.ok) sent++;
    else failed++;
  }

  return { sent, failed };
};

let polling = false;

export const runDueReminders = async () => {
  if (polling) return; // munnadi tick innum send panniyittu irukku
  polling = true;

  try {
    const now = new Date();
    const due = await Reminder.find({ status: "active", nextRunAt: { $lte: now } })
      .sort({ nextRunAt: 1 })
      .limit(100);

    for (const r of due) {
      const occurrence = r.nextRunAt;

      // Expiry: expire aana apram send pannaadhu
      if (r.expiresAt && occurrence > r.expiresAt) {
        await Reminder.updateOne(
          { _id: r._id, status: "active", nextRunAt: occurrence },
          { $set: { status: "expired" }, $unset: { nextRunAt: "" } }
        );
        console.log(`⌛ Expired: ${r._id}`);
        continue;
      }

      let next = computeNextRun(r, new Date(Math.max(now.getTime(), occurrence.getTime() + 1)));
      if (next && r.expiresAt && next > r.expiresAt) next = null;

      const update = {
        $set: { lastRunAt: now, status: next ? "active" : "completed" },
        $inc: { runCount: 1 },
      };
      if (next) update.$set.nextRunAt = next;
      else update.$unset = { nextRunAt: "" };

      // Claim: vera instance/tick already advance pannala na mattum munneruvom
           const claimed = await Reminder.findOneAndUpdate(
        { _id: r._id, status: "active", nextRunAt: occurrence },
        update,
        { returnDocument: "after" }
      );
      if (!claimed) continue;

      try {
        const result = await triggerReminder(claimed, { occurrence });
        console.log(`✅ ${claimed._id}: ${result.sent} sent, ${result.failed} failed`);
      } catch (e) {
        console.error(`❌ Reminder ${claimed._id} failed:`, e.message);
      }
    }
  } catch (e) {
    console.error("❌ Scheduler tick failed:", e.message);
  } finally {
    polling = false;
  }
};

export const startScheduler = async () => {
  // Migration time-la Nudge old scheduler-um microservice scheduler-um rendum ஓடினா double-send aagum
  if (process.env.SCHEDULER_ENABLED === "false") {
    console.log(" Scheduler disabled (SCHEDULER_ENABLED=false)");
    return;
  }

  cron.schedule("* * * * *", runDueReminders);
    startRetryWorker();
  const pending = await Reminder.countDocuments({ status: "active" });
  console.log(`Scheduler started: ${pending} active reminders`);
  runDueReminders();
};