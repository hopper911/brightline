"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trackContactSubmit } from "@/lib/analytics";

export default function ContactPage() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    company: "",
    projectType: "",
    budget: "",
    location: "",
    timeline: "",
    companyWebsite: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("intent") === "portfolio-pdf") {
      setForm((prev) => ({
        ...prev,
        projectType: "portfolio-pdf",
        message: prev.message || "I would like to receive a copy of the portfolio PDF.",
      }));
    }
  }, [searchParams]);

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

      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setForm({
        name: "",
        email: "",
        message: "",
        company: "",
        projectType: "",
        budget: "",
        location: "",
        timeline: "",
        companyWebsite: "",
      });
      setStatus("sent");
      trackContactSubmit({});
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="section-pad mx-auto min-h-screen max-w-6xl px-6 lg:px-10">
      <section className="grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-start">
        <div className="sticky top-28 space-y-6">
          <div>
            <p className="section-kicker">Contact</p>
            <h1 className="section-title max-w-2xl">Start with the essentials.</h1>
            <p className="section-subtitle max-w-xl">
              Send the minimum details. I’ll reply with next steps, timing, and what else is needed.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/72">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Response</p>
              <p className="mt-2 text-white/85">Usually within 24 hours.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">Direct email</p>
              <a className="mt-2 block text-white/85 underline-offset-4 hover:underline" href="mailto:info@brightlinephotography.com">
                info@brightlinephotography.com
              </a>
            </div>
          </div>
          <Link className="btn btn-ghost" href="/work">
            View work first
          </Link>
        </div>

        <div>
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-[28px] border border-white/10 bg-black/50 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8"
            aria-describedby="contact-status"
          >
            <p className="text-xs uppercase tracking-[0.32em] text-white/45">Inquiry</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-widest text-white/60" htmlFor="name">
                Name
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/35 focus:outline-none"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </label>
              <label className="block text-xs uppercase tracking-widest text-white/60" htmlFor="email">
                Email
                <input
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/35 focus:outline-none"
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  required
                />
              </label>
            </div>

            <label className="block text-xs uppercase tracking-widest text-white/60" htmlFor="message">
              What do you need?
              <textarea
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/35 focus:outline-none"
                id="message"
                name="message"
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="A few words is enough: project type, location, timing, or a link."
                required
              />
            </label>

            <details className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.24em] text-white/55">
                Add optional details
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company"
                />
                <input
                  className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Location"
                />
                <input
                  className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/35"
                  value={form.timeline}
                  onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                  placeholder="Timeline"
                />
                <select
                  className="rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white"
                  value={form.projectType}
                  onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                >
                  <option value="">Project type</option>
                  <option value="architecture">Architecture</option>
                  <option value="advertising">Advertising</option>
                  <option value="corporate">Corporate</option>
                  <option value="portfolio-pdf">Portfolio PDF request</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </details>

            <input
              type="text"
              name="companyWebsite"
              value={form.companyWebsite}
              onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
              tabIndex={-1}
              autoComplete="off"
              className="absolute -left-[9999px]"
              aria-hidden
            />

            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>

            <div id="contact-status" aria-live="polite">
              {status === "sent" && (
                <p className="mt-3 text-xs uppercase tracking-widest text-emerald-300">
                  Message sent successfully.
                </p>
              )}
              {status === "error" && (
                <p className="mt-3 text-xs uppercase tracking-widest text-red-300" role="alert">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
