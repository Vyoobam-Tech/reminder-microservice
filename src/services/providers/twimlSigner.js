import crypto from "crypto";

const secret = () => {
  if (!process.env.TWIML_SECRET) throw new Error("TWIML_SECRET missing in .env");
  return process.env.TWIML_SECRET;
};

export const signTwiml = (text, language) =>
  crypto.createHmac("sha256", secret()).update(`${language}|${text}`).digest("hex");

export const verifyTwiml = (text, language, sig) => {
  if (!text || !language || !sig) return false;
  const expected = Buffer.from(signTwiml(text, language));
  const given = Buffer.from(String(sig));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};