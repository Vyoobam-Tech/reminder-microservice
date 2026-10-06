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

export const twilioError = (err) => `${err.code ? `[${err.code}] ` : ""}${err.message}`;