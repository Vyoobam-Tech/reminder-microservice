import { sendEmail } from "./providers/emailProvider.js";
import { sendSMS } from "./providers/smsProvider.js";
import { sendWhatsApp } from "./providers/whatsappProvider.js";
import { sendVoice } from "./providers/voiceProvider.js";

const providers = { email: sendEmail, sms: sendSMS, whatsapp: sendWhatsApp, voice: sendVoice };

// MOCK_CHANNELS=sms → andha channel mattum mock, mathadhu live
const mockChannels = () =>
  (process.env.MOCK_CHANNELS || "").split(",").map((s) => s.trim()).filter(Boolean);

const useMock = (channel) =>
  (process.env.DELIVERY_MODE || "mock") !== "live" || mockChannels().includes(channel);

// Return: { ok, providerId, error, retryable }. Idhu throw pannaadhu.
export const deliver = async (channel, reminder) => {
  const to = channel === "email" ? reminder.recipient.email : reminder.recipient.phone;

  if (useMock(channel)) {
    if (process.env.MOCK_FAIL === channel) {
      return { ok: false, providerId: null, error: "Mock temporary failure", retryable: true };
    }
    if (process.env.MOCK_FAIL_PERMANENT === channel) {
      return { ok: false, providerId: null, error: "Mock permanent failure", retryable: false };
    }
    console.log(`[MOCK ${channel}] to=${to} message="${reminder.message}"`);
    return { ok: true, providerId: `mock-${Date.now()}`, error: null, retryable: false };
  }

  const provider = providers[channel];
  if (!provider) {
    return { ok: false, providerId: null, error: `Unsupported channel: ${channel}`, retryable: false };
  }

  try {
    const result = await provider(reminder);
    if (process.env.DEBUG_DELIVERY === "true") console.log(`[DELIVERY ${channel}]`, result);
    return { retryable: false, ...result };
  } catch (e) {
    return { ok: false, providerId: null, error: e.message, retryable: false };
  }
};