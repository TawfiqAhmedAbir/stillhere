import {
  CHECKPOINT_LABELS,
  type Checkpoint,
  type Place,
  getLocalTimeParts,
  parseTimeToMinutes,
} from "./geo.js";
import { prisma } from "./db.js";

type PersonWithLocations = {
  id: string;
  name: string;
  leaveHomeTime: string;
  workStartTime: string;
  workEndTime: string;
  arriveHomeTime: string;
  graceMinutes: number;
  responseMinutes: number;
  timezone: string;
  setupComplete: boolean;
};

function checkpointConfig(person: PersonWithLocations): {
  checkpoint: Checkpoint;
  expectedMinutes: number;
  shouldBeAt: Place | "NOT_HOME" | "NOT_WORK";
  message: string;
}[] {
  return [
    {
      checkpoint: "LEAVE_HOME",
      expectedMinutes: parseTimeToMinutes(person.leaveHomeTime),
      shouldBeAt: "NOT_HOME",
      message: `You usually leave home by ${person.leaveHomeTime}. Everything okay?`,
    },
    {
      checkpoint: "ARRIVE_WORK",
      expectedMinutes: parseTimeToMinutes(person.workStartTime),
      shouldBeAt: "WORK",
      message: `You should be at work by ${person.workStartTime}. Let your family know what's happening.`,
    },
    {
      checkpoint: "LEAVE_WORK",
      expectedMinutes: parseTimeToMinutes(person.workEndTime),
      shouldBeAt: "NOT_WORK",
      message: `Work ends at ${person.workEndTime}. Are you on your way home?`,
    },
    {
      checkpoint: "ARRIVE_HOME",
      expectedMinutes: parseTimeToMinutes(person.arriveHomeTime),
      shouldBeAt: "HOME",
      message: `You should be home by ${person.arriveHomeTime}. Send a quick message so they know you're okay.`,
    },
  ];
}

function isCheckpointViolated(
  shouldBeAt: Place | "NOT_HOME" | "NOT_WORK",
  currentPlace: Place
): boolean {
  switch (shouldBeAt) {
    case "HOME":
      return currentPlace !== "HOME";
    case "WORK":
      return currentPlace !== "WORK";
    case "NOT_HOME":
      return currentPlace === "HOME";
    case "NOT_WORK":
      return currentPlace === "WORK";
    default:
      return false;
  }
}

export async function evaluatePerson(person: PersonWithLocations) {
  if (!person.setupComplete) return;

  const { date, minutes: nowMinutes } = getLocalTimeParts(person.timezone);
  const latestPing = await prisma.locationPing.findFirst({
    where: { personId: person.id },
    orderBy: { createdAt: "desc" },
  });

  if (!latestPing) return;

  const currentPlace = latestPing.place as Place;
  const configs = checkpointConfig(person);

  for (const config of configs) {
    const deadline = config.expectedMinutes + person.graceMinutes;
    if (nowMinutes < deadline) continue;

    const existing = await prisma.dailyCheckpoint.findUnique({
      where: {
        personId_date_checkpoint: {
          personId: person.id,
          date,
          checkpoint: config.checkpoint,
        },
      },
    });
    if (existing) continue;

    if (!isCheckpointViolated(config.shouldBeAt, currentPlace)) continue;

    const anomaly = await prisma.anomaly.create({
      data: {
        personId: person.id,
        checkpoint: config.checkpoint,
        status: "TRIGGERED",
        message: config.message,
      },
    });

    await prisma.dailyCheckpoint.create({
      data: {
        personId: person.id,
        date,
        checkpoint: config.checkpoint,
        anomalyId: anomaly.id,
      },
    });

    console.log(
      `[routine] Triggered ${config.checkpoint} for ${person.name} (${person.id})`
    );
  }
}

export async function evaluateEscalations(person: PersonWithLocations) {
  const triggered = await prisma.anomaly.findMany({
    where: { personId: person.id, status: "TRIGGERED" },
  });

  const now = Date.now();
  const responseMs = person.responseMinutes * 60 * 1000;

  for (const anomaly of triggered) {
    if (now - anomaly.triggeredAt.getTime() < responseMs) continue;

    await prisma.anomaly.update({
      where: { id: anomaly.id },
      data: { status: "ESCALATED", escalatedAt: new Date() },
    });

    console.log(
      `[routine] Escalated ${anomaly.checkpoint} for ${person.name} — caregiver should be notified`
    );
  }
}

export async function runRoutineEngine() {
  const persons = await prisma.monitoredPerson.findMany({
    where: { setupComplete: true },
  });

  for (const person of persons) {
    await evaluatePerson(person);
    await evaluateEscalations(person);
  }
}

export function formatCheckpoint(checkpoint: string): string {
  return CHECKPOINT_LABELS[checkpoint as Checkpoint] ?? checkpoint;
}
