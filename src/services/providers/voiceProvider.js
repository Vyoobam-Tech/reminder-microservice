import { getTwilio, twilioError } from "./twilioClient.js";
import { normalizePhone } from "./phone.js";
import { signTwiml } from "./twimlSigner.js";
import { twilioRetryable } from "./retryable.js";

const buildSpokenText = (name, message, language) => {
  if (language === "ta-IN") return `வணக்கம் ${name}. இது உங்கள் நினைவூட்டல் அழைப்பு. ${message} நன்றி.`;
  if (language === "hi-IN") return `नमस्ते ${name}। यह आपकी रिमाइंडर कॉल है। ${message} धन्यवाद।`;
  return `Hello ${name}, this is your reminder call. ${message} Thank you.`;
};

export const sendVoice = async (reminder) => {
  const to = normalizePhone(reminder.recipient.phone);
  if (!to) return { ok: false, providerId: null, error: "Invalid phone number" };

  const from = process.env.TWILIO_PHONE;
  if (!from) throw new Error("TWILIO_PHONE missing in .env");
  if (!process.env.BASE_URL) throw new Error("BASE_URL (public URL) missing in .env");
  if (to === from) {
    return { ok: false, providerId: null, error: "Sender and receiver cannot be the same number" };
  }

  const language = reminder.voiceLanguage || "en-IN";
  const text = buildSpokenText(reminder.recipient.name, reminder.message, language);

  // Trial account-la inline twiml allow illa, so signed URL use panrom
  const url =
    `${process.env.BASE_URL}/twiml/voice` +
    `?text=${encodeURIComponent(text)}` +
    `&language=${encodeURIComponent(language)}` +
    `&sig=${signTwiml(text, language)}`;

  if (url.length > 3500) {
    return { ok: false, providerId: null, error: "Message too long for a voice call" };
  }

   try {
    const call = await getTwilio().calls.create({ to, from, url });
    return { ok: true, providerId: call.sid, error: null };
  } catch (err) {
    return { ok: false, providerId: null, error: twilioError(err), retryable: twilioRetryable(err) };
  }
};