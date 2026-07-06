import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { DeviceSession } from "./api";
import { sendLocationPing } from "./api";
import { SESSION_KEY } from "./storage";

export const LOCATION_TASK = "stillhere-background-location";

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[location task]", error);
    return;
  }
  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations?.[0];
  if (!latest) return;

  const SecureStore = await import("expo-secure-store");
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return;

  const session = JSON.parse(raw) as DeviceSession;
  try {
    await sendLocationPing(session, latest.coords.latitude, latest.coords.longitude);
  } catch (err) {
    console.error("[location ping]", err);
  }
});

export async function startBackgroundTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error("Location permission required");

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) throw new Error("Background location required for StillHere to work");

  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (started) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 100,
    foregroundService: {
      title: "StillHere is watching your routine",
      body: "Location is used to know when you're on your way.",
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function sendImmediatePing(session: DeviceSession) {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  await sendLocationPing(session, loc.coords.latitude, loc.coords.longitude);
}
