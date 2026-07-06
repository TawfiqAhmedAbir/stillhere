import { Router } from "express";
import { generatePairingCode } from "../lib/geo.js";
import { formatCheckpoint } from "../lib/routine-engine.js";
import { prisma } from "../lib/db.js";
import { requireCaregiver } from "../middleware/auth.js";

const router = Router();

router.use(requireCaregiver);

router.get("/", async (req, res) => {
  const persons = await prisma.monitoredPerson.findMany({
    where: { caregiverId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ persons });
});

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }

  let pairingCode = generatePairingCode();
  while (await prisma.monitoredPerson.findUnique({ where: { pairingCode } })) {
    pairingCode = generatePairingCode();
  }

  const person = await prisma.monitoredPerson.create({
    data: {
      name,
      pairingCode,
      caregiverId: req.auth!.userId,
    },
  });

  res.status(201).json({ person });
});

router.get("/:id", async (req, res) => {
  const person = await prisma.monitoredPerson.findFirst({
    where: { id: req.params.id, caregiverId: req.auth!.userId },
  });
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const latestPing = await prisma.locationPing.findFirst({
    where: { personId: person.id },
    orderBy: { createdAt: "desc" },
  });

  const activeAnomaly = await prisma.anomaly.findFirst({
    where: { personId: person.id, status: "TRIGGERED" },
    orderBy: { triggeredAt: "desc" },
  });

  res.json({ person, latestPing, activeAnomaly });
});

router.patch("/:id/routine", async (req, res) => {
  const person = await prisma.monitoredPerson.findFirst({
    where: { id: req.params.id, caregiverId: req.auth!.userId },
  });
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const {
    leaveHomeTime,
    workStartTime,
    workEndTime,
    arriveHomeTime,
    graceMinutes,
    responseMinutes,
    timezone,
  } = req.body;

  const updated = await prisma.monitoredPerson.update({
    where: { id: person.id },
    data: {
      ...(leaveHomeTime != null && { leaveHomeTime }),
      ...(workStartTime != null && { workStartTime }),
      ...(workEndTime != null && { workEndTime }),
      ...(arriveHomeTime != null && { arriveHomeTime }),
      ...(graceMinutes != null && { graceMinutes }),
      ...(responseMinutes != null && { responseMinutes }),
      ...(timezone != null && { timezone }),
    },
  });

  res.json({ person: updated });
});

router.patch("/:id/locations", async (req, res) => {
  const person = await prisma.monitoredPerson.findFirst({
    where: { id: req.params.id, caregiverId: req.auth!.userId },
  });
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { homeLat, homeLng, workLat, workLng, homeRadiusM, workRadiusM, clear } =
    req.body;

  if (clear === true) {
    const updated = await prisma.monitoredPerson.update({
      where: { id: person.id },
      data: {
        homeLat: null,
        homeLng: null,
        workLat: null,
        workLng: null,
        setupComplete: false,
      },
    });
    res.json({ person: updated });
    return;
  }

  const updated = await prisma.monitoredPerson.update({
    where: { id: person.id },
    data: {
      ...(homeLat != null && { homeLat }),
      ...(homeLng != null && { homeLng }),
      ...(workLat != null && { workLat }),
      ...(workLng != null && { workLng }),
      ...(homeRadiusM != null && { homeRadiusM }),
      ...(workRadiusM != null && { workRadiusM }),
      setupComplete:
        (homeLat ?? person.homeLat) != null &&
        (homeLng ?? person.homeLng) != null &&
        (workLat ?? person.workLat) != null &&
        (workLng ?? person.workLng) != null,
    },
  });

  res.json({ person: updated });
});

router.get("/:id/anomalies", async (req, res) => {
  const person = await prisma.monitoredPerson.findFirst({
    where: { id: req.params.id, caregiverId: req.auth!.userId },
  });
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const anomalies = await prisma.anomaly.findMany({
    where: { personId: person.id },
    include: { response: true },
    orderBy: { triggeredAt: "desc" },
    take: 50,
  });

  res.json({
    anomalies: anomalies.map((a: (typeof anomalies)[number]) => ({
      ...a,
      checkpointLabel: formatCheckpoint(a.checkpoint),
    })),
  });
});

router.get("/:id/pings", async (req, res) => {
  const person = await prisma.monitoredPerson.findFirst({
    where: { id: req.params.id, caregiverId: req.auth!.userId },
  });
  if (!person) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const pings = await prisma.locationPing.findMany({
    where: { personId: person.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json({ pings });
});

export default router;
