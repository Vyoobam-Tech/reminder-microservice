import express from "express";
import twilio from "twilio";
import { applyProviderStatus } from "../services/providerStatusService.js";

const router = express.Router();

router.post("/twilio/status", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    // Real Twilio-vulla irundhu vandhadha nu signature check
    if (process.env.TWILIO_VALIDATE_WEBHOOKS !== "false") {
      const url = `${(process.env.BASE_URL || "").replace(/\/$/, "")}/webhooks/twilio/status`;
      const valid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN || "",
        req.header("X-Twilio-Signature") || "",
        url,
        req.body
      );
      if (!valid) return res.status(403).send("Invalid signature");
    }

    const sid = req.body.MessageSid || req.body.SmsSid || req.body.CallSid;
    const status = req.body.MessageStatus || req.body.SmsStatus || req.body.CallStatus;
    if (!sid || !status) return res.status(400).send("Missing SID or status");

    await applyProviderStatus(sid, status, req.body.ErrorCode, req.body.ErrorMessage);
    res.sendStatus(204); // log illa naalum 204, Twilio marubadi marubadi anuppaadhu
  } catch (e) {
    console.error("❌ Webhook error:", e.message);
    res.sendStatus(500);
  }
});

export default router;
