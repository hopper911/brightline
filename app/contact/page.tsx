"use client";

import { useState } from "react";
import Link from "next/link";

const initialState = {
  name: "",
  email: "",
  message: "",
  company: "",
};

export default function ContactPage() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      setForm(initialState);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen">
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-wide">
            Contact
          </h1>
          <p className="mt-2 text-sm opacity-80">
            Share your project details and timeline. We reply within 24 hours with
            availability and a tailored scope.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded border border-white/10 bg-black/40 p-6">
            <label className="text-xs uppercase tracking-widest opacity-70" htmlFor="name">
              Name
            </label>
            <input
              className="mt-2 w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm"
              id="name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              required
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="email">
              Email
            </label>
            <input
              className="mt-2 w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm"
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              required
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="message">
              Project details
            </label>
            <textarea
              className="mt-2 w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm"
              id="message"
              name="message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Location, number of spaces, target launch date"
              required
            />

            <label className="sr-only" htmlFor="company">
              Company
            </label>
            <input
              className="sr-only"
              id="company"
              name="company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
            />

            <button
              type="submit"
              className="mt-6 inline-flex items-center justify-center rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest hover:border-white/50"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Send inquiry"}
            </button>

            {status === "sent" && (
              <p className="mt-3 text-xs uppercase tracking-widest text-emerald-300">
                Message sent successfully.
              </p>
            )}
            {status === "error" && (
              <p className="mt-3 text-xs uppercase tracking-widest text-red-300">
                Something went wrong. Please try again.
              </p>
            )}
          </form>

          <div className="rounded border border-white/10 bg-black/40 p-6">
            <p className="text-xs uppercase tracking-widest opacity-70">Studio contact</p>
            <h2 className="mt-4 text-xl font-semibold tracking-wide">Let’s talk details.</h2>
            <p className="mt-2 text-sm opacity-80">
              Email or call to discuss timelines, scope, and usage needs.
            </p>
            <p className="mt-4 text-sm">hello@brightline.photo</p>
            <p className="text-sm">+1 (212) 555-0139</p>
            <Link
              className="mt-6 inline-flex items-center justify-center rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest hover:border-white/50"
              href="/portfolio"
            >
              View portfolio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
