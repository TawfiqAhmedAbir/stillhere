import path from "path";
import fs from "fs";
import "dotenv/config";
import express from "express";
import cors from "cors";
import cron from "node-cron";
import authRoutes from "./routes/auth.js";
import personsRoutes from "./routes/persons.js";
import deviceRoutes from "./routes/device.js";
import locationRoutes from "./routes/location.js";
import { initPush, checkAndNotifyEscalations } from "./lib/push.js";
import { runRoutineEngine } from "./lib/routine-engine.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "stillhere-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/persons", personsRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/location", locationRoutes);

initPush();

cron.schedule("* * * * *", async () => {
  try {
    await runRoutineEngine();
    await checkAndNotifyEscalations();
  } catch (err) {
    console.error("[cron] Routine engine error:", err);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`StillHere API running on port ${PORT}`);
});
