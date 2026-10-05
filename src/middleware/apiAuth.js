import crypto from "crypto";
import Application from "../models/Application.js";

export const hashKey = (key) => crypto.createHash("sha256").update(key).digest("hex");

const apiAuth = async (req, res, next) => {
  try {
    const key = req.header("X-API-Key");
    if (!key) {
      return res.status(401).json({ success: false, message: "API key missing" });
    }

    const application = await Application.findOne({ apiKeyHash: hashKey(key), isActive: true });
    if (!application) {
      return res.status(401).json({ success: false, message: "Invalid API key" });
    }

    req.application = application;
    next();
  } catch (err) {
    next(err);
  }
};

export default apiAuth;