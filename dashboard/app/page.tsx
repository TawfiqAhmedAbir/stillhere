"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, saveToken } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("stillhere_token")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login(email, password)
          : await register(email, password, name);
      saveToken(result.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>StillHere</h1>
      <p className="subtitle">
        Gentle check-ins when the routine breaks — for families who care.
      </p>

      <div className="card">
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <p className="subtitle" style={{ marginBottom: "1rem" }}>
          Use this on your iPhone. Mom uses the Android app.
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label>Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Tawfi"
              />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && (
            <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>
              {error}
            </p>
          )}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: "0.75rem" }}
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
