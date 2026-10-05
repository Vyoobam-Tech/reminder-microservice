import "dotenv/config";
import crypto from "crypto";
import mongoose from "mongoose";
import Application from "../src/models/Application.js";
import { hashKey } from "../src/middleware/apiAuth.js";

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run create-app -- <application-name>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const apiKey = "rms_" + crypto.randomBytes(24).toString("hex");
await Application.create({ name, apiKeyHash: hashKey(apiKey) });

console.log("\nApplication created:", name);
console.log("API KEY (inga mattum theriyum, save pannikko):", apiKey, "\n");

await mongoose.disconnect();