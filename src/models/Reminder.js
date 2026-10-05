import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    tenantId: { type: String, default: "default", index: true },
    externalId: { type: String },

    title: { type: String, trim: true },
    message: { type: String, required: true },

    recipient: {
      name: { type: String, required: true },
      phone: String,
      email: String,
    },
    channels: [{ type: String, enum: ["email", "sms", "whatsapp", "voice"] }],
    voiceLanguage: { type: String, enum: ["en-IN", "ta-IN", "hi-IN"], default: "en-IN" },
    mediaUrl: String,

    scheduledAt: { type: Date, required: true },
    expiresAt: Date,
    timezone: { type: String, default: "Asia/Kolkata" },
    recurrence: {
      type: String,
      enum: ["One-time", "Daily", "Weekly", "Monthly", "Yearly"],
      default: "One-time",
    },

    status: {
      type: String,
      enum: ["active", "paused", "completed", "expired", "cancelled"],
      default: "active",
    },
    nextRunAt: { type: Date },
    lastRunAt: Date,
    runCount: { type: Number, default: 0 },

    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Idempotency: same app + tenant + externalId oru thadava mattum
reminderSchema.index(
  { applicationId: 1, tenantId: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: "string" } } }
);
// Scheduler query-ku
reminderSchema.index({ status: 1, nextRunAt: 1 });

export default mongoose.model("Reminder", reminderSchema);