import cron from "node-cron";
import DeliveryLog from "../models/DeliveryLog.js";
import Reminder from "../models/Reminder.js";
import { runAttempt, maxAttempts } from "../services/deliveryRunner.js";

const STUCK_MINUTES = 5;
let running = false;

// Crash-la "pending"-la maatikkitta logs-a meetpom (at-least-once)
const recoverStuck = async () => {
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60 * 1000);

  // Last attempt-la crash aana: marubadi anuppaadhu
  await DeliveryLog.updateMany(
    { status: "pending", updatedAt: { $lt: cutoff }, attempt: { $gte: maxAttempts() } },
    { $set: { status: "failed", error: "Interrupted on final attempt" }, $unset: { nextRetryAt: "" } }
  );

  const res = await DeliveryLog.updateMany(
    { status: "pending", updatedAt: { $lt: cutoff } },
    { $set: { status: "retrying", nextRetryAt: new Date(), error: "Recovered after interrupted send" } }
  );
  if (res.modifiedCount) console.log(`🛟 Recovered ${res.modifiedCount} interrupted deliveries`);
};

export const runDueRetries = async () => {
  if (running) return;
  running = true;

  try {
    await recoverStuck();

    const now = new Date();
    const due = await DeliveryLog.find({ status: "retrying", nextRetryAt: { $lte: now } })
      .sort({ nextRetryAt: 1 })
      .limit(100);

    for (const d of due) {
      const reminder = await Reminder.findById(d.reminderId);

      // Reminder cancel/delete aana retry niruthu
      if (!reminder || reminder.status === "cancelled") {
        await DeliveryLog.updateOne(
          { _id: d._id, status: "retrying" },
          { $set: { status: "failed", error: "Reminder cancelled or deleted before retry" }, $unset: { nextRetryAt: "" } }
        );
        continue;
      }

      // Paused na skip, resume aanadhum adutha tick-la retry aagum
      if (reminder.status === "paused") continue;

      // Atomic claim: vera instance eduthuruntha null varum
      const log = await DeliveryLog.findOneAndUpdate(
        { _id: d._id, status: "retrying", nextRetryAt: { $lte: now } },
        { $set: { status: "pending" }, $unset: { nextRetryAt: "" }, $inc: { attempt: 1 } },
        { returnDocument: "after" }
      );
      if (!log) continue;

      const result = await runAttempt(log, reminder);
      console.log(
        `🔁 Retry ${log.channel} (attempt ${log.attempt}) for ${reminder._id}: ${result.ok ? "sent" : `failed - ${result.error}`}`
      );
    }
  } catch (e) {
    console.error("❌ Retry worker failed:", e.message);
  } finally {
    running = false;
  }
};

export const startRetryWorker = () => {
  cron.schedule("* * * * *", runDueRetries);
  console.log("🔁 Retry worker started");
};