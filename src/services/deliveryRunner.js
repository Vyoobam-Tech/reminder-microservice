import DeliveryLog from "../models/DeliveryLog.js";
import { deliver } from "./deliveryService.js";

// RETRY_DELAYS_MINUTES=1,5,15 → first attempt + 3 retries
export const retryDelays = () =>
  (process.env.RETRY_DELAYS_MINUTES || "1,5,15")
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => n > 0);

export const maxAttempts = () => retryDelays().length + 1;

/**
 * Status "pending"-la irukkura log-ku oru attempt ஓட்டum, result-a log-la ezhudhum.
 * Fail aana: retryable + attempts meedhi irundha "retrying", illa na "failed".
 */
export const runAttempt = async (log, reminder) => {
  let result;
  try {
    result = await deliver(log.channel, reminder);
  } catch (e) {
    result = { ok: false, providerId: null, error: e.message, retryable: false };
  }

  let update;
  if (result.ok) {
    update = {
      $set: { status: "sent", sentAt: new Date(), ...(result.providerId ? { providerId: result.providerId } : {}) },
      $unset: { error: "", nextRetryAt: "" },
    };
  } else {
    const delayMin = retryDelays()[log.attempt - 1]; // attempt 1 → 1st delay
    if (result.retryable && delayMin) {
      update = {
        $set: {
          status: "retrying",
          error: result.error,
          nextRetryAt: new Date(Date.now() + delayMin * 60 * 1000),
        },
      };
    } else {
      update = { $set: { status: "failed", error: result.error }, $unset: { nextRetryAt: "" } };
    }
  }

  // status "pending" na mattum update: recovery-oda race aagaadhu
  await DeliveryLog.updateOne({ _id: log._id, status: "pending" }, update).catch((e) =>
    console.error("❌ Failed to update delivery log:", e.message)
  );

  return result;
};