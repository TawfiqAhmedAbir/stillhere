import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/db.js";
import { requireDevice } from "../middleware/auth.js";

const router = Router();

router.post("/pair", async (req, res) => {
  const { pairingCode } = req.body;
  if (!pairingCode) {
    res.status(400).json({ error: "pairingCode required" });
    return;
  }

  const person = await prisma.monitoredPerson.findUnique({
    where: { pairingCode: pairingCode.toUpperCase().trim() },
  });

  if (!person) {
    res.status(404).json({ error: "Invalid pairing code" });
    return;
  }

  const deviceToken = crypto.randomBytes(32).toString("hex");
  await prisma.monitoredPerson.update({
    where: { id: person.id },
    data: { deviceToken },
  });

  res.json({
    personId: person.id,
    deviceToken,
    name: person.name,
    setupComplete: person.setupComplete,
    routine: {
      leaveHomeTime: person.leaveHomeTime,
      workStartTime: person.workStartTime,
      workEndTime: person.workEndTime,
      arriveHomeTime: person.arriveHomeTime,
      graceMinutes: person.graceMinutes,
      responseMinutes: person.responseMinutes,
    },
  });
});

async function verifyDevice(personId: string, deviceToken: string) {
  const person = await prisma.monitoredPerson.findFirst({
    where: { id: personId, deviceToken },
  });
  return person;
}

router.get("/active-alert", requireDevice, async (req, res) => {
  const person = await verifyDevice(
    req.personId!,
    req.headers["x-device-token"] as string
  );
  if (!person) {
    res.status(401).json({ error: "Invalid device" });
    return;
  }

  const anomaly = await prisma.anomaly.findFirst({
    where: { personId: person.id, status: "TRIGGERED" },
    orderBy: { triggeredAt: "desc" },
  });

  res.json({ anomaly });
});

router.get("/routine", requireDevice, async (req, res) => {
  const person = await verifyDevice(
    req.personId!,
    req.headers["x-device-token"] as string
  );
  if (!person) {
    res.status(401).json({ error: "Invalid device" });
    return;
  }

  res.json({
    name: person.name,
    setupComplete: person.setupComplete,
    routine: {
      leaveHomeTime: person.leaveHomeTime,
      workStartTime: person.workStartTime,
      workEndTime: person.workEndTime,
      arriveHomeTime: person.arriveHomeTime,
      graceMinutes: person.graceMinutes,
      responseMinutes: person.responseMinutes,
    },
    locations: {
      home: person.homeLat
        ? { lat: person.homeLat, lng: person.homeLng, radiusM: person.homeRadiusM }
        : null,
      work: person.workLat
        ? { lat: person.workLat, lng: person.workLng, radiusM: person.workRadiusM }
        : null,
    },
  });
});

export default router;
