export type Place = "HOME" | "WORK" | "TRANSIT" | "UNKNOWN";

export type Checkpoint =
  | "LEAVE_HOME"
  | "ARRIVE_WORK"
  | "LEAVE_WORK"
  | "ARRIVE_HOME";

export const CHECKPOINT_LABELS: Record<Checkpoint, string> = {
  LEAVE_HOME: "Leave home",
  ARRIVE_WORK: "Arrive at work",
  LEAVE_WORK: "Leave work",
  ARRIVE_HOME: "Arrive home",
};

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inferPlace(
  lat: number,
  lng: number,
  person: {
    homeLat: number | null;
    homeLng: number | null;
    homeRadiusM: number;
    workLat: number | null;
    workLng: number | null;
    workRadiusM: number;
  }
): Place {
  if (person.homeLat != null && person.homeLng != null) {
    if (
      haversineMeters(lat, lng, person.homeLat, person.homeLng) <=
      person.homeRadiusM
    ) {
      return "HOME";
    }
  }
  if (person.workLat != null && person.workLng != null) {
    if (
      haversineMeters(lat, lng, person.workLat, person.workLng) <=
      person.workRadiusM
    ) {
      return "WORK";
    }
  }
  if (person.homeLat != null || person.workLat != null) {
    return "TRANSIT";
  }
  return "UNKNOWN";
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function getLocalTimeParts(timezone: string, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: parseTimeToMinutes(`${get("hour")}:${get("minute")}`),
  };
}

export function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
