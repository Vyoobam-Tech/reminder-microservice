import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import { startScheduler } from "./scheduler/scheduleReminder.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "reminder-microservice", uptime: process.uptime() });
});

app.use("/api", rateLimit({ windowMs: 60 * 1000, limit: 300 }));
app.use("/api/v1/reminders", reminderRoutes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  startScheduler();
  app.listen(PORT, () => console.log(`Reminder service running on port ${PORT}`));
});