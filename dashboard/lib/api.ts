export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface MonitoredPerson {
  id: string;
  name: string;
  pairingCode: string;
  leaveHomeTime: string;
  workStartTime: string;
  workEndTime: string;
  arriveHomeTime: string;
  graceMinutes: number;
  responseMinutes: number;
  homeLat: number | null;
  homeLng: number | null;
  workLat: number | null;
  workLng: number | null;
  homeRadiusM: number;
  workRadiusM: number;
  setupComplete: boolean;
  timezone: string;
}

export interface LocationPing {
  id: string;
  lat: number;
  lng: number;
  place: string;
  createdAt: string;
}

export interface Anomaly {
  id: string;
  checkpoint: string;
  checkpointLabel?: string;
  status: string;
  message: string;
  triggeredAt: string;
  respondedAt: string | null;
  escalatedAt: string | null;
  response?: { type: string; content: string } | null;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("stillhere_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export function saveToken(token: string) {
  localStorage.setItem("stillhere_token", token);
}

export function clearToken() {
  localStorage.removeItem("stillhere_token");
}

export async function register(email: string, password: string, name: string) {
  return api<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  return api<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getPersons() {
  return api<{ persons: MonitoredPerson[] }>("/api/persons");
}

export async function createPerson(name: string) {
  return api<{ person: MonitoredPerson }>("/api/persons", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function getPerson(id: string) {
  return api<{
    person: MonitoredPerson;
    latestPing: LocationPing | null;
    activeAnomaly: Anomaly | null;
  }>(`/api/persons/${id}`);
}

export async function updateRoutine(
  id: string,
  routine: Partial<
    Pick<
      MonitoredPerson,
      | "leaveHomeTime"
      | "workStartTime"
      | "workEndTime"
      | "arriveHomeTime"
      | "graceMinutes"
      | "responseMinutes"
      | "timezone"
    >
  >
) {
  return api<{ person: MonitoredPerson }>(`/api/persons/${id}/routine`, {
    method: "PATCH",
    body: JSON.stringify(routine),
  });
}

export async function updateLocations(
  id: string,
  locations: {
    homeLat?: number;
    homeLng?: number;
    workLat?: number;
    workLng?: number;
  }
) {
  return api<{ person: MonitoredPerson }>(`/api/persons/${id}/locations`, {
    method: "PATCH",
    body: JSON.stringify(locations),
  });
}

export async function resetLocations(id: string) {
  return api<{ person: MonitoredPerson }>(`/api/persons/${id}/locations`, {
    method: "PATCH",
    body: JSON.stringify({ clear: true }),
  });
}

export async function getAnomalies(id: string) {
  return api<{ anomalies: Anomaly[] }>(`/api/persons/${id}/anomalies`);
}

export async function subscribePush(subscription: PushSubscriptionJSON) {
  return api<{ ok: boolean }>("/api/auth/push-subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });
}
