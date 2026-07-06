import Constants from "expo-constants";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:3001";

export interface DeviceSession {
  personId: string;
  deviceToken: string;
  name: string;
}

export interface Anomaly {
  id: string;
  checkpoint: string;
  message: string;
  triggeredAt: string;
}

async function deviceHeaders(session: DeviceSession) {
  return {
    "Content-Type": "application/json",
    "X-Person-Id": session.personId,
    "X-Device-Token": session.deviceToken,
  };
}

export async function pairDevice(code: string): Promise<DeviceSession & { setupComplete: boolean }> {
  const res = await fetch(`${API_URL}/api/device/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pairingCode: code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Pairing failed");
  return data;
}

export async function sendLocationPing(
  session: DeviceSession,
  lat: number,
  lng: number
) {
  const res = await fetch(`${API_URL}/api/location/ping`, {
    method: "POST",
    headers: await deviceHeaders(session),
    body: JSON.stringify({ lat, lng }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Ping failed");
  }
  return res.json();
}

export async function getActiveAlert(session: DeviceSession): Promise<Anomaly | null> {
  const res = await fetch(`${API_URL}/api/device/active-alert`, {
    headers: await deviceHeaders(session),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.anomaly ?? null;
}

export async function respondPreset(
  session: DeviceSession,
  anomalyId: string,
  preset: "fine" | "late" | "help"
) {
  const res = await fetch(`${API_URL}/api/location/respond/preset`, {
    method: "POST",
    headers: await deviceHeaders(session),
    body: JSON.stringify({ anomalyId, preset }),
  });
  if (!res.ok) throw new Error("Failed to send");
}

export async function respondText(
  session: DeviceSession,
  anomalyId: string,
  text: string
) {
  const res = await fetch(`${API_URL}/api/location/respond/text`, {
    method: "POST",
    headers: await deviceHeaders(session),
    body: JSON.stringify({ anomalyId, text }),
  });
  if (!res.ok) throw new Error("Failed to send");
}

export async function respondVoice(
  session: DeviceSession,
  anomalyId: string,
  uri: string
) {
  const form = new FormData();
  form.append("anomalyId", anomalyId);
  form.append("audio", {
    uri,
    name: "voice.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const res = await fetch(`${API_URL}/api/location/respond/voice`, {
    method: "POST",
    headers: {
      "X-Person-Id": session.personId,
      "X-Device-Token": session.deviceToken,
    },
    body: form,
  });
  if (!res.ok) throw new Error("Failed to send voice");
}
