import { getTwilio, statusCallbackUrl, twilioError } from "./twilioClient.js";
import { normalizePhone } from "./phone.js";
import { twilioRetryable } from "./retryable.js";
export const sendWhatsApp = async (reminder) => {
  const phone = normalizePhone(reminder.recipient.phone);
  if (!phone) return { ok: false, providerId: null, error: "Invalid phone number" };

  if (!process.env.TWILIO_WHATSAPP_NUMBER) throw new Error("TWILIO_WHATSAPP_NUMBER missing in .env");

   try {
    const msg = await getTwilio().messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`,
      body: reminder.message,
      ...(reminder.mediaUrl ? { mediaUrl: [reminder.mediaUrl] } : {}),
      ...(statusCallbackUrl() ? { statusCallback: statusCallbackUrl() } : {}),
    });
    return { ok: true, providerId: msg.sid, error: null };
  } catch (err) {
    return { ok: false, providerId: null, error: twilioError(err), retryable: twilioRetryable(err) };
  }
};