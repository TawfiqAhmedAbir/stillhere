import webpush from "web-push";
import { prisma } from "./db.js";

let configured = false;

export function initPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.warn("[push] VAPID keys not set — web push disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function notifyCaregiver(
  caregiverId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const user = await prisma.user.findUnique({ where: { id: caregiverId } });
  if (!user?.pushSubscription || !configured) return;

  try {
    const sub = JSON.parse(user.pushSubscription);
    await webpush.sendNotification(
      sub,
      JSON.stringify({ title, body, data })
    );
  } catch (err) {
    console.error("[push] Failed to notify caregiver:", err);
  }
}

export async function checkAndNotifyEscalations() {
  const escalated = await prisma.anomaly.findMany({
    where: {
      status: "ESCALATED",
      escalatedAt: { gte: new Date(Date.now() - 60_000) },
    },
    include: {
      person: { include: { caregiver: true } },
    },
  });

  for (const anomaly of escalated) {
    const latestPing = await prisma.locationPing.findFirst({
      where: { personId: anomaly.personId },
      orderBy: { createdAt: "desc" },
    });

    const place = latestPing?.place ?? "UNKNOWN";
    const { formatCheckpoint } = await import("./routine-engine.js");

    await notifyCaregiver(
      anomaly.person.caregiverId,
      `${anomaly.person.name} hasn't responded`,
      `${formatCheckpoint(anomaly.checkpoint)} — last seen: ${place}`,
      { anomalyId: anomaly.id, personId: anomaly.personId }
    );
  }
}
