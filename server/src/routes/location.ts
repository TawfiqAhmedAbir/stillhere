import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { inferPlace } from "../lib/geo.js";
import { prisma } from "../lib/db.js";
import { requireDevice } from "../middleware/auth.js";
import { notifyCaregiver } from "../lib/push.js";
import { formatCheckpoint } from "../lib/routine-engine.js";

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

async function verifyDevice(personId: string, deviceToken: string) {
  return prisma.monitoredPerson.findFirst({
    where: { id: personId, deviceToken },
    include: { caregiver: true },
  });
}

router.post("/ping", requireDevice, async (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat and lng required" });
    return;
  }

  const person = await verifyDevice(
    req.personId!,
    req.headers["x-device-token"] as string
  );
  if (!person) {
    res.status(401).json({ error: "Invalid device" });
    return;
  }

  const place = inferPlace(lat, lng, person);

  const ping = await prisma.locationPing.create({
    data: { personId: person.id, lat, lng, place },
  });

  res.json({ ping });
});

router.post("/respond/text", requireDevice, async (req, res) => {
  const { anomalyId, text } = req.body;
  if (!anomalyId || !text) {
    res.status(400).json({ error: "anomalyId and text required" });
    return;
  }

  const person = await verifyDevice(
    req.personId!,
    req.headers["x-device-token"] as string
  );
  if (!person) {
    res.status(401).json({ error: "Invalid device" });
    return;
  }

  const anomaly = await prisma.anomaly.findFirst({
    where: { id: anomalyId, personId: person.id, status: "TRIGGERED" },
  });
  if (!anomaly) {
    res.status(404).json({ error: "No active alert" });
    return;
  }

  await prisma.$transaction([
    prisma.response.create({
      data: { anomalyId, type: "TEXT", content: text },
    }),
    prisma.anomaly.update({
      where: { id: anomalyId },
      data: { status: "RESPONDED", respondedAt: new Date() },
    }),
  ]);

  await notifyCaregiver(
    person.caregiverId,
    `${person.name} replied`,
    text,
    { anomalyId, personId: person.id }
  );

  res.json({ ok: true });
});

router.post("/respond/preset", requireDevice, async (req, res) => {
  const { anomalyId, preset } = req.body;
  const presets: Record<string, string> = {
    fine: "I'm fine",
    late: "I'm running late",
    help: "I need help",
  };

  if (!anomalyId || !presets[preset]) {
    res.status(400).json({ error: "anomalyId and valid preset required" });
    return;
  }

  const person = await verifyDevice(
    req.personId!,
    req.headers["x-device-token"] as string
  );
  if (!person) {
    res.status(401).json({ error: "Invalid device" });
    return;
  }

  const anomaly = await prisma.anomaly.findFirst({
    where: { id: anomalyId, personId: person.id, status: "TRIGGERED" },
  });
  if (!anomaly) {
    res.status(404).json({ error: "No active alert" });
    return;
  }

  const content = presets[preset];

  await prisma.$transaction([
    prisma.response.create({
      data: { anomalyId, type: "PRESET", content },
    }),
    prisma.anomaly.update({
      where: { id: anomalyId },
      data: { status: "RESPONDED", respondedAt: new Date() },
    }),
  ]);

  const title =
    preset === "help" ? `${person.name} needs help` : `${person.name} replied`;

  await notifyCaregiver(person.caregiverId, title, content, {
    anomalyId,
    personId: person.id,
  });

  res.json({ ok: true });
});

router.post(
  "/respond/voice",
  requireDevice,
  upload.single("audio"),
  async (req, res) => {
    const { anomalyId } = req.body;
    if (!anomalyId || !req.file) {
      res.status(400).json({ error: "anomalyId and audio file required" });
      return;
    }

    const person = await verifyDevice(
      req.personId!,
      req.headers["x-device-token"] as string
    );
    if (!person) {
      res.status(401).json({ error: "Invalid device" });
      return;
    }

    const anomaly = await prisma.anomaly.findFirst({
      where: { id: anomalyId, personId: person.id, status: "TRIGGERED" },
    });
    if (!anomaly) {
      res.status(404).json({ error: "No active alert" });
      return;
    }

    const content = `/uploads/${req.file.filename}`;

    await prisma.$transaction([
      prisma.response.create({
        data: { anomalyId, type: "VOICE", content },
      }),
      prisma.anomaly.update({
        where: { id: anomalyId },
        data: { status: "RESPONDED", respondedAt: new Date() },
      }),
    ]);

    await notifyCaregiver(
      person.caregiverId,
      `${person.name} sent a voice message`,
      formatCheckpoint(anomaly.checkpoint),
      { anomalyId, personId: person.id, voiceUrl: content }
    );

    res.json({ ok: true, url: content });
  }
);

export default router;
