import express from "express";
import { verifyTwiml } from "../services/providers/twimlSigner.js";

const router = express.Router();

const escapeXml = (v) =>
  String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const VOICES = {
  "en-IN": "Google.en-IN-Standard-A",
  "ta-IN": "Google.ta-IN-Wavenet-C",
  "hi-IN": "Google.hi-IN-Wavenet-E",
};

const voiceTwiml = (req, res) => {
  const { text, language, sig } = req.query;

  // Signature illa / thappu na reject: yaarum thanga text-a call-la pesa vaikka mudiyaadhu
  let valid = false;
  try {
    valid = verifyTwiml(text, language, sig);
  } catch {
    valid = false;
  }
  if (!valid) return res.status(403).send("Forbidden");

  const voice = VOICES[language] || VOICES["en-IN"];
  res.type("text/xml").send(
    `<Response><Say voice="${voice}" language="${escapeXml(language)}">${escapeXml(text)}</Say></Response>`
  );
};

router.get("/voice", voiceTwiml);
router.post("/voice", voiceTwiml); // Twilio default POST

export default router;