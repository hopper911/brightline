"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid credentials.");
      return;
    }
    if (res?.ok) {
      window.location.href = "/admin";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full rounded-full border border-black/20 bg-white/70 px-6 py-3 text-sm text-black/80"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-full border border-black/20 bg-white/70 px-6 py-3 text-sm text-black/80"
      />
      {error && (
        <p className="text-xs uppercase tracking-[0.2em] text-red-500">{error}</p>
      )}
      <button type="submit" className="btn btn-primary w-full">
        Sign in
      </button>
    </form>
  );
}
