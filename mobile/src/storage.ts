import * as SecureStore from "expo-secure-store";
import type { DeviceSession } from "./api";

const KEY = "stillhere_session";

export { KEY as SESSION_KEY };

export async function saveSession(session: DeviceSession) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<DeviceSession | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  return JSON.parse(raw) as DeviceSession;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(KEY);
}
