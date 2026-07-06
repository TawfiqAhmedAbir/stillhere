"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  clearToken,
  createPerson,
  getPersons,
  subscribePush,
  type MonitoredPerson,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [persons, setPersons] = useState<MonitoredPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("stillhere_token")) {
      router.replace("/");
      return;
    }
    load();
    requestPush();
  }, [router]);

  async function load() {
    try {
      const data = await getPersons();
      setPersons(data.persons);
    } catch {
      clearToken();
      router.replace("/");
    } finally {
      setLoading(false);
    }
  }

  async function requestPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await subscribePush(sub.toJSON());
    } catch {
      /* push optional for v1 */
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createPerson(newName.trim());
      setNewName("");
      await load();
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <main className="container">
        <p className="subtitle">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>StillHere</h1>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "auto", padding: "0.5rem 1rem" }}
          onClick={() => {
            clearToken();
            router.replace("/");
          }}
        >
          Sign out
        </button>
      </div>
      <p className="subtitle">People you&apos;re watching</p>

      {persons.map((p) => (
        <Link key={p.id} href={`/person/?id=${p.id}`} style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer" }}>
            <strong>{p.name}</strong>
            <div style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {p.setupComplete ? "Monitoring active" : "Setup incomplete — tap to finish"}
            </div>
          </div>
        </Link>
      ))}

      <div className="card">
        <h2>Add someone</h2>
        <form onSubmit={handleAdd}>
          <div className="field">
            <label>Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Mom"
            />
          </div>
          <button className="btn" type="submit" disabled={adding}>
            {adding ? "Adding…" : "Add person"}
          </button>
        </form>
      </div>
    </main>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
