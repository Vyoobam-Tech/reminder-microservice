import express from "express";
import apiAuth from "../middleware/apiAuth.js";
import validate from "../middleware/validate.js";
import { createReminderSchema, updateReminderSchema } from "../validators/reminderValidator.js";
import {
  createReminder, listReminders, getReminder, updateReminder,
  cancelReminder, pauseReminder, resumeReminder, getReminderLogs,
} from "../controllers/reminderController.js";

const router = express.Router();

router.use(apiAuth);

router.post("/", validate(createReminderSchema), createReminder);
router.get("/", listReminders);
router.get("/:id", getReminder);
router.put("/:id", validate(updateReminderSchema), updateReminder);
router.delete("/:id", cancelReminder);
router.post("/:id/pause", pauseReminder);
router.post("/:id/resume", resumeReminder);
router.get("/:id/logs", getReminderLogs);

export default router;