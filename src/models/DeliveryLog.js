import mongoose from "mongoose";

const deliveryLogSchema = new mongoose.Schema(
  {
    reminderId: { type: mongoose.Schema.Types.ObjectId, ref: "Reminder", required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    tenantId: String,

    channel: { type: String, enum: ["email", "sms", "whatsapp", "voice"], required: true },
    to: String,
    status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    providerId: String,   // Twilio SID / SendGrid message id
    error: String,
    attempt: { type: Number, default: 1 },
    nextRetryAt: Date,
    sentAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("DeliveryLog", deliveryLogSchema);