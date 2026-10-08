import DeliveryLog from "../models/DeliveryLog.js";

// Callbacks order-la varaadhu. Pazhaiya status pudhu status-a overwrite pannakoodaadhu.
const RANK = {
  queued: 1, accepted: 1, scheduled: 1, initiated: 1,
  sending: 2, ringing: 2,
  sent: 3, "in-progress": 3,
  delivered: 4, undelivered: 4, failed: 4,
  completed: 4, busy: 4, "no-answer": 4, canceled: 4,
  read: 5,
};
const DELIVERED = ["delivered", "read", "in-progress", "completed"];
const ERRORS = ["undelivered", "failed", "busy", "no-answer", "canceled"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const applyProviderStatus = async (providerId, status, errorCode, errorMessage) => {
  let log = await DeliveryLog.findOne({ providerId });

  // Callback, providerId-a log-la save pannum munnadi vandhirukkalaam. Oru thadava marubadi try.
  if (!log) {
    await sleep(1500);
    log = await DeliveryLog.findOne({ providerId });
  }
  if (!log) return null;

  const incoming = RANK[status] ?? 0;
  const current = RANK[log.deliveryStatus] ?? 0;
  if (incoming < current) return log; // out-of-order, ignore

  const set = { deliveryStatus: status, providerStatusAt: new Date() };
  if (DELIVERED.includes(status) && !log.deliveredAt) set.deliveredAt = new Date();
  if (ERRORS.includes(status)) {
    set.providerError = errorCode ? `[${errorCode}] ${errorMessage || status}` : status;
  }

  await DeliveryLog.updateOne({ _id: log._id }, { $set: set });
  return log;
};
