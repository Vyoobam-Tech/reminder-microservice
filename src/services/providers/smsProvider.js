import twilio from "twilio";

let client;
const getClient = () => {
  if (!client) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials missing in .env");
    }
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
};

// Nudge maari: 10 digit na +91. "+" irundha adhe.
const toE164 = (phone) => {
  if (!phone) return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
};

export const sendSMS = async (reminder) => {
  const to = toE164(reminder.recipient.phone);
  if (!to) return { ok: false, providerId: null, error: "Invalid phone number" };

  const from = process.env.TWILIO_PHONE;
  if (!from) throw new Error("TWILIO_PHONE missing in .env");
  if (to === from) {
    return { ok: false, providerId: null, error: "Sender and receiver cannot be the same number" };
  }

  try {
    const msg = await getClient().messages.create({ body: reminder.message, from, to });
    return { ok: true, providerId: msg.sid, error: null };
  } catch (err) {
    return { ok: false, providerId: null, error: `${err.code ? `[${err.code}] ` : ""}${err.message}` };
  }
};