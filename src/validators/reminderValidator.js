import { z } from "zod";

const baseSchema = z.object({
  tenantId: z.string().trim().min(1).optional(),
  externalId: z.string().trim().min(1).optional(),
  title: z.string().trim().optional(),
  message: z.string().trim().min(1, "message is required"),
  recipient: z.object({
    name: z.string().trim().min(1, "recipient name is required"),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
  }),
  channels: z.array(z.enum(["email", "sms", "whatsapp", "voice"])).min(1),
  voiceLanguage: z.enum(["en-IN", "ta-IN", "hi-IN"]).optional(),
  mediaUrl: z.string().url().optional(),
  scheduledAt: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  timezone: z.string().default("Asia/Kolkata"),
  recurrence: z.enum(["One-time", "Daily", "Weekly", "Monthly", "Yearly"]).default("One-time"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const createReminderSchema = baseSchema.superRefine((data, ctx) => {
  if (data.channels.includes("email") && !data.recipient.email) {
    ctx.addIssue({ code: "custom", path: ["recipient", "email"], message: "email required for email channel" });
  }
  const needsPhone = data.channels.some((c) => ["sms", "whatsapp", "voice"].includes(c));
  if (needsPhone && !data.recipient.phone) {
    ctx.addIssue({ code: "custom", path: ["recipient", "phone"], message: "phone required for sms/whatsapp/voice" });
  }
  if (data.expiresAt && data.expiresAt <= data.scheduledAt) {
    ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "expiresAt must be after scheduledAt" });
  }
});

export const updateReminderSchema = baseSchema.partial();

export const sendReminderSchema = z.object({
  channels: z.array(z.enum(["email", "sms", "whatsapp", "voice"])).min(1).optional(),
});