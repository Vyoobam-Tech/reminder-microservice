import twilio from "twilio";

let client;

export const getTwilio = () => {
  if (!client) {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials missing in .env");
    }
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return client;
};
export const statusCallbackUrl = () => {
  const base = process.env.BASE_URL;
  if (!base || /localhost|127\.0\.0\.1/.test(base)) return undefined;
  return `${base.replace(/\/$/, "")}/webhooks/twilio/status`;
};

export const twilioError = (err) => `${err.code ? `[${err.code}] ` : ""}${err.message}`;