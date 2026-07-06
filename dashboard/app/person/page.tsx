"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPerson,
  getAnomalies,
  updateRoutine,
  updateLocations,
  API_URL,
  type MonitoredPerson,
  type LocationPing,
  type Anomaly,
} from "@/lib/api";

function PersonPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const router = useRouter();
  const [person, setPerson] = useState<MonitoredPerson | null>(null);
  const [latestPing, setLatestPing] = useState<LocationPing | null>(null);
  const [activeAnomaly, setActiveAnomaly] = useState<Anomaly | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    if (!localStorage.getItem("stillhere_token")) {
      router.replace("/");
      return;
    }
    const [detail, history] = await Promise.all([
      getPerson(id),
      getAnomalies(id),
    ]);
    setPerson(detail.person);
    setLatestPing(detail.latestPing);
    setActiveAnomaly(detail.activeAnomaly);
    setAnomalies(history.anomalies);
  }, [id, router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  async function saveRoutine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!person || !id) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const { person: updated } = await updateRoutine(id, {
        leaveHomeTime: form.get("leaveHomeTime") as string,
        workStartTime: form.get("workStartTime") as string,
        workEndTime: form.get("workEndTime") as string,
        arriveHomeTime: form.get("arriveHomeTime") as string,
        graceMinutes: Number(form.get("graceMinutes")),
        responseMinutes: Number(form.get("responseMinutes")),
      });
      setPerson(updated);
      setMessage("Routine saved");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveLocation(type: "home" | "work") {
    if (!person || !id) return;
    if (!navigator.geolocation) {
      setMessage("Geolocation not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data =
          type === "home"
            ? { homeLat: pos.coords.latitude, homeLng: pos.coords.longitude }
            : { workLat: pos.coords.latitude, workLng: pos.coords.longitude };
        const { person: updated } = await updateLocations(id, data);
        setPerson(updated);
        setMessage(`${type === "home" ? "Home" : "Work"} location saved`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  if (!id) {
    return (
      <main className="container">
        <p className="subtitle">Missing person ID.</p>
        <Link href="/dashboard/">← Back to dashboard</Link>
      </main>
    );
  }

  if (!person) {
    return (
      <main className="container">
        <p className="subtitle">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <Link href="/dashboard/" style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
        ← Back
      </Link>
      <h1 style={{ marginTop: "0.5rem" }}>{person.name}</h1>

      {activeAnomaly && (
        <div className="alert-banner">
          <strong>Waiting for response</strong>
          <p>{activeAnomaly.message}</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Alert sent — she has {person.responseMinutes} minutes to reply before you&apos;re notified.
          </p>
        </div>
      )}

      <div className="card">
        <h2>Pair Android app</h2>
        <p className="subtitle">
          Install StillHere on Mom&apos;s phone and enter this code:
        </p>
        <div className="pairing-code">{person.pairingCode}</div>
      </div>

      <div className="card">
        <h2>Current status</h2>
        {latestPing ? (
          <>
            <span className={`badge badge-${latestPing.place.toLowerCase()}`}>
              {latestPing.place}
            </span>
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "var(--muted)" }}>
              Last update: {new Date(latestPing.createdAt).toLocaleString()}
            </p>
            <div className="map-links" style={{ marginTop: "0.75rem" }}>
              <a
                href={`https://maps.google.com/?q=${latestPing.lat},${latestPing.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            </div>
          </>
        ) : (
          <p className="subtitle">No location yet — waiting for the Android app.</p>
        )}
      </div>

      <div className="card">
        <h2>Daily routine</h2>
        <p className="subtitle">
          Work {person.workStartTime}–{person.workEndTime}. Buzz after {person.graceMinutes} min late.
        </p>
        <form onSubmit={saveRoutine}>
          <div className="grid-2">
            <div className="field">
              <label>Leave home by</label>
              <input name="leaveHomeTime" defaultValue={person.leaveHomeTime} type="time" />
            </div>
            <div className="field">
              <label>Arrive at work by</label>
              <input name="workStartTime" defaultValue={person.workStartTime} type="time" />
            </div>
            <div className="field">
              <label>Leave work by</label>
              <input name="workEndTime" defaultValue={person.workEndTime} type="time" />
            </div>
            <div className="field">
              <label>Arrive home by</label>
              <input name="arriveHomeTime" defaultValue={person.arriveHomeTime} type="time" />
            </div>
            <div className="field">
              <label>Late grace (minutes)</label>
              <input name="graceMinutes" defaultValue={person.graceMinutes} type="number" min={1} max={60} />
            </div>
            <div className="field">
              <label>Reply window (minutes)</label>
              <input name="responseMinutes" defaultValue={person.responseMinutes} type="number" min={1} max={30} />
            </div>
          </div>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save routine"}
          </button>
        </form>
        {message && <p style={{ marginTop: "0.75rem", color: "var(--success)" }}>{message}</p>}
      </div>

      <div className="card">
        <h2>Places</h2>
        <p className="subtitle">
          Stand at home/work with Mom&apos;s phone, or use your location if you&apos;re there now.
        </p>
        <button className="btn btn-secondary" type="button" onClick={() => saveLocation("home")} style={{ marginBottom: "0.5rem" }}>
          Set home location {person.homeLat ? "✓" : ""}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => saveLocation("work")}>
          Set work location {person.workLat ? "✓" : ""}
        </button>
        {!person.setupComplete && (
          <p style={{ marginTop: "0.75rem", color: "var(--warning)" }}>
            Set both home and work to start monitoring.
          </p>
        )}
      </div>

      <div className="card">
        <h2>History</h2>
        {anomalies.length === 0 ? (
          <p className="subtitle">No alerts yet.</p>
        ) : (
          anomalies.map((a) => (
            <div
              key={a.id}
              className={`timeline-item ${a.status.toLowerCase()}`}
            >
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                <strong>{a.checkpointLabel || a.checkpoint}</strong>
              </div>
              <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                {new Date(a.triggeredAt).toLocaleString()}
              </p>
              {a.response && (
                <p style={{ marginTop: "0.5rem" }}>
                  {a.response.type === "VOICE" ? (
                    <audio controls src={`${API_URL}${a.response.content}`} />
                  ) : (
                    a.response.content
                  )}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function PersonPage() {
  return (
    <Suspense fallback={<main className="container"><p className="subtitle">Loading…</p></main>}>
      <PersonPageContent />
    </Suspense>
  );
}
