"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
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
      Sentry.addBreadcrumb({ category: "contact", message: "Form submit started", level: "info" });

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
      Sentry.addBreadcrumb({ category: "contact", message: "Form submit succeeded", level: "info" });
    } catch (err) {
      Sentry.addBreadcrumb({ category: "contact", message: "Form submit failed", level: "error" });
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen">
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Contact</h1>
          <p className="mt-2 text-sm opacity-80">Share your project details and timeline.</p>
          <p className="mt-1 text-sm font-medium text-white/90">We respond within 24 hours.</p>
        </div>
      </section>

      <section className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8"
            aria-describedby="contact-status"
          >
            <label className="block text-xs uppercase tracking-widest opacity-70" htmlFor="name">
              Name
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="name"
              name="name"
              aria-invalid={status === "error"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              required
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="company">
              Company
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="company"
              name="company"
              aria-invalid={status === "error"}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Your company or agency"
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="email">
              Email
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="email"
              name="email"
              type="email"
              aria-invalid={status === "error"}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              required
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="projectType">
              Project type
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="projectType"
              name="projectType"
              value={form.projectType}
              onChange={(e) => setForm({ ...form, projectType: e.target.value })}
            >
              <option value="">Select...</option>
              <option value="architecture">Architecture & Real Estate</option>
              <option value="campaign">Campaign & Advertising</option>
              <option value="corporate">Corporate & Executive</option>
              <option value="portfolio-pdf">Portfolio PDF request</option>
              <option value="other">Other</option>
            </select>

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="budget">
              Budget range
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="budget"
              name="budget"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            >
              <option value="">Select...</option>
              <option value="under-5k">Under $5,000</option>
              <option value="5k-15k">$5,000 – $15,000</option>
              <option value="15k-30k">$15,000 – $30,000</option>
              <option value="30k-plus">$30,000+</option>
            </select>

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="location">
              Location
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="location"
              name="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, region, or worldwide"
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="timeline">
              Timeline
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="timeline"
              name="timeline"
              value={form.timeline}
              onChange={(e) => setForm({ ...form, timeline: e.target.value })}
              placeholder="e.g. Q2 2026, flexible"
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="message">
              Message
            </label>
            <textarea
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="message"
              name="message"
              rows={5}
              aria-invalid={status === "error"}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Project details, timeline, and how we can help."
              required
            />

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
              className="hover-border mt-6 inline-flex items-center justify-center rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest hover:border-white/50 disabled:opacity-50"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Send inquiry"}
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

          <div className="rounded border border-white/10 bg-black/40 p-6">
            <p className="text-xs uppercase tracking-widest opacity-70">Studio contact</p>
            <h2 className="mt-4 text-xl font-semibold tracking-wide">Let&apos;s talk details.</h2>
            <p className="mt-2 text-sm opacity-80">
              Email to discuss timelines, scope, and usage needs.
            </p>
            <p className="mt-4 text-sm">hello@brightlinephotography.co</p>
            <Link
              className="hover-border mt-6 inline-flex items-center justify-center rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest hover:border-white/50"
              href="/work"
            >
              View work
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
