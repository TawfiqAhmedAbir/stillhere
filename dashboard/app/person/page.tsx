"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import LocationMap from "@/components/LocationMapLoader";
import type { MapPoint } from "@/components/LocationMapLoader";
import {
  getPerson,
  getAnomalies,
  updateRoutine,
  updateLocations,
  resetLocations,
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
  const [savingPlaces, setSavingPlaces] = useState(false);
  const [resettingPlaces, setResettingPlaces] = useState(false);
  const [message, setMessage] = useState("");
  const [homeDraft, setHomeDraft] = useState<MapPoint | null>(null);
  const [workDraft, setWorkDraft] = useState<MapPoint | null>(null);

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
    if (detail.person.homeLat != null && detail.person.homeLng != null) {
      setHomeDraft({ lat: detail.person.homeLat, lng: detail.person.homeLng });
    }
    if (detail.person.workLat != null && detail.person.workLng != null) {
      setWorkDraft({ lat: detail.person.workLat, lng: detail.person.workLng });
    }
  }, [id, router]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const handleHomeChange = useCallback((p: MapPoint) => setHomeDraft(p), []);
  const handleWorkChange = useCallback((p: MapPoint) => setWorkDraft(p), []);

  async function savePlaces() {
    if (!id || !homeDraft || !workDraft) return;
    setSavingPlaces(true);
    setMessage("");
    try {
      const { person: updated } = await updateLocations(id, {
        homeLat: homeDraft.lat,
        homeLng: homeDraft.lng,
        workLat: workDraft.lat,
        workLng: workDraft.lng,
      });
      setPerson(updated);
      setMessage("Locations saved — monitoring active");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPlaces(false);
    }
  }

  async function resetPlaces() {
    if (!id) return;
    if (
      !confirm(
        "Clear home and work locations? Monitoring will pause until you save new ones."
      )
    ) {
      return;
    }
    setResettingPlaces(true);
    setMessage("");
    try {
      const { person: updated } = await resetLocations(id);
      setPerson(updated);
      setHomeDraft(null);
      setWorkDraft(null);
      setMessage("Locations reset — place home and work again");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResettingPlaces(false);
    }
  }

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
        <h2>Home &amp; work</h2>
        <p className="subtitle">
          Search an address or tap the map to place home and work. Drag pins to fine-tune.
        </p>
        <LocationMap
          home={homeDraft}
          work={workDraft}
          onHomeChange={handleHomeChange}
          onWorkChange={handleWorkChange}
          onSave={savePlaces}
          onReset={resetPlaces}
          saving={savingPlaces}
          resetting={resettingPlaces}
          saved={person.setupComplete}
        />
        {!person.setupComplete && homeDraft && workDraft && (
          <p style={{ marginTop: "0.75rem", color: "var(--warning)" }}>
            Tap <strong>Save locations</strong> to start monitoring.
          </p>
        )}
        {person.setupComplete && (
          <p style={{ marginTop: "0.75rem", color: "var(--success)" }}>
            Monitoring active — use <strong>Reset locations</strong> to change them
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
