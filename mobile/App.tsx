import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import {
  pairDevice,
  getActiveAlert,
  respondPreset,
  respondVoice,
  type DeviceSession,
  type Anomaly,
} from "./src/api";
import { loadSession, saveSession, clearSession } from "./src/storage";
import { startBackgroundTracking, sendImmediatePing } from "./src/location";

export default function App() {
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [alert, setAlert] = useState<Anomaly | null>(null);
  const [status, setStatus] = useState("Setting up…");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    loadSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session) return;

    (async () => {
      try {
        await startBackgroundTracking();
        await sendImmediatePing(session);
        setStatus("StillHere is quietly watching your day.");
      } catch (err) {
        setStatus(
          err instanceof Error ? err.message : "Could not start location"
        );
      }
    })();

    const poll = setInterval(async () => {
      const active = await getActiveAlert(session);
      if (active && active.id !== alert?.id) {
        setAlert(active);
        Vibration.vibrate([0, 800, 400, 800]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      if (!active) setAlert(null);
    }, 15_000);

    return () => clearInterval(poll);
  }, [session, alert?.id]);

  async function handlePair() {
    if (code.trim().length < 4) return;
    setPairing(true);
    try {
      const result = await pairDevice(code.trim());
      const s: DeviceSession = {
        personId: result.personId,
        deviceToken: result.deviceToken,
        name: result.name,
      };
      await saveSession(s);
      setSession(s);
    } catch (err) {
      Alert.alert("Could not connect", err instanceof Error ? err.message : "Try again");
    } finally {
      setPairing(false);
    }
  }

  async function handlePreset(preset: "fine" | "late" | "help") {
    if (!session || !alert) return;
    await respondPreset(session, alert.id, preset);
    setAlert(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function startRecording() {
    if (!session || !alert) return;
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    recordingRef.current = rec;
    setRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  async function stopRecordingAndSend() {
    const rec = recordingRef.current;
    if (!rec || !session || !alert) return;
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    recordingRef.current = null;
    setRecording(false);
    if (uri) {
      await respondVoice(session, alert.id, uri);
      setAlert(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.title}>StillHere</Text>
        <Text style={styles.subtitle}>
          Enter the code from your family member&apos;s phone.
        </Text>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="ABC123"
          placeholderTextColor="#94a3b8"
          maxLength={6}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handlePair}
          disabled={pairing}
        >
          <Text style={styles.primaryBtnText}>
            {pairing ? "Connecting…" : "Connect"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (alert) {
    return (
      <SafeAreaView style={styles.alertContainer}>
        <StatusBar style="light" />
        <Text style={styles.alertTitle}>Just checking in</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>

        <TouchableOpacity
          style={[styles.holdBtn, recording && styles.holdBtnActive]}
          onPressIn={startRecording}
          onPressOut={stopRecordingAndSend}
        >
          <Text style={styles.holdBtnText}>
            {recording ? "Release to send" : "Hold to talk"}
          </Text>
        </TouchableOpacity>

        <View style={styles.presetRow}>
          <TouchableOpacity style={styles.presetBtn} onPress={() => handlePreset("fine")}>
            <Text style={styles.presetText}>I&apos;m fine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetBtn} onPress={() => handlePreset("late")}>
            <Text style={styles.presetText}>Running late</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.presetBtn, styles.helpBtn]} onPress={() => handlePreset("help")}>
            <Text style={styles.presetText}>Need help</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>Hi, {session.name}</Text>
      <Text style={styles.subtitle}>{status}</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          You don&apos;t need to do anything. If your routine is off, this phone will buzz and ask you to send a quick message.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={async () => {
          await clearSession();
          setSession(null);
        }}
      >
        <Text style={styles.secondaryBtnText}>Disconnect</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 24,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#64748b",
    marginBottom: 32,
    lineHeight: 26,
  },
  codeInput: {
    fontSize: 32,
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    color: "#0f172a",
  },
  primaryBtn: {
    backgroundColor: "#1a56db",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardText: {
    fontSize: 17,
    lineHeight: 26,
    color: "#334155",
  },
  secondaryBtn: {
    marginTop: 24,
    padding: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#64748b",
    fontSize: 16,
  },
  alertContainer: {
    flex: 1,
    backgroundColor: "#1e3a8a",
    padding: 24,
    justifyContent: "center",
  },
  alertTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 20,
    color: "#bfdbfe",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 30,
  },
  holdBtn: {
    backgroundColor: "#fff",
    paddingVertical: 32,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  holdBtnActive: {
    backgroundColor: "#fecaca",
  },
  holdBtnText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e3a8a",
  },
  presetRow: {
    gap: 12,
  },
  presetBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  helpBtn: {
    backgroundColor: "#dc2626",
  },
  presetText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
