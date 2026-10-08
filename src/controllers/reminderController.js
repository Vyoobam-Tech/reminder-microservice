import mongoose from "mongoose";
import Reminder from "../models/Reminder.js";
import DeliveryLog from "../models/DeliveryLog.js";
import { triggerReminder } from "../scheduler/scheduleReminder.js";

const findOwned = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  return Reminder.findOne({ _id: req.params.id, applicationId: req.application._id });
};

const notFound = (res) => res.status(404).json({ success: false, message: "Reminder not found" });

export const createReminder = async (req, res, next) => {
  try {
    const data = req.body;
    const applicationId = req.application._id;
    const tenantId = data.tenantId || "default";

    if (data.scheduledAt < new Date()) {
      return res.status(400).json({ success: false, message: "scheduledAt must be in the future" });
    }

    // Idempotency
    if (data.externalId) {
      const existing = await Reminder.findOne({ applicationId, tenantId, externalId: data.externalId });
      if (existing) {
        return res.status(200).json({ success: true, duplicate: true, data: existing });
      }
    }

    const reminder = await Reminder.create({
      ...data,
      applicationId,
      tenantId,
      nextRunAt: data.scheduledAt,
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate externalId" });
    }
    next(err);
  }
};

export const listReminders = async (req, res, next) => {
  try {
    const { status, tenantId, page = 1, limit = 20 } = req.query;
    const filter = { applicationId: req.application._id };
    if (status) filter.status = status;
    if (tenantId) filter.tenantId = tenantId;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Reminder.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Reminder.countDocuments(filter),
    ]);

    res.json({ success: true, data: items, pagination: { page: pageNum, limit: limitNum, total } });
  } catch (err) {
    next(err);
  }
};

export const getReminder = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);
    res.json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
};

export const updateReminder = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);

    if (!["active", "paused"].includes(reminder.status)) {
      return res.status(400).json({ success: false, message: `Cannot update a ${reminder.status} reminder` });
    }

    reminder.set(req.body);
    if (req.body.scheduledAt) reminder.nextRunAt = req.body.scheduledAt;
    await reminder.save();

    res.json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
};

export const cancelReminder = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);

    reminder.status = "cancelled";
    reminder.nextRunAt = undefined;
    await reminder.save();

    res.json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
};

export const pauseReminder = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);
    if (reminder.status !== "active") {
      return res.status(400).json({ success: false, message: "Only active reminders can be paused" });
    }

    reminder.status = "paused";
    await reminder.save();
    res.json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
};

export const resumeReminder = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);
    if (reminder.status !== "paused") {
      return res.status(400).json({ success: false, message: "Only paused reminders can be resumed" });
    }

    reminder.status = "active";
    // Pause-la irundhu varumbodhu nextRunAt past-la irundha ippove run aagum
    if (!reminder.nextRunAt || reminder.nextRunAt < new Date()) reminder.nextRunAt = new Date();
    await reminder.save();
    res.json({ success: true, data: reminder });
  } catch (err) {
    next(err);
  }
};

export const getReminderLogs = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);

    const logs = await DeliveryLog.find({ reminderId: reminder._id, applicationId: req.application._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

export const sendNow = async (req, res, next) => {
  try {
    const reminder = await findOwned(req);
    if (!reminder) return notFound(res);

    if (["cancelled", "expired"].includes(reminder.status)) {
      return res.status(400).json({ success: false, message: `Cannot send a ${reminder.status} reminder` });
    }

    const requested = req.body.channels;
    const channels = requested ? requested.filter((c) => reminder.channels.includes(c)) : reminder.channels;
    if (!channels.length) {
      return res.status(400).json({ success: false, message: "No valid channels for this reminder" });
    }

    // Manual send runCount/nextRunAt-a maathaadhu
    const result = await triggerReminder(reminder, { trigger: "manual", occurrence: new Date(), channels });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};