"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setError("Invalid credentials");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8">
        <h1 className="text-3xl font-semibold">Clinic Login</h1>
        <p className="mt-2 text-sm text-slate-400">Access the admin dashboard.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <button className="mt-6 w-full rounded-2xl bg-cyan-500 px-4 py-3 font-medium text-white">
          Login
        </button>
      </form>
    </main>
  );
}

