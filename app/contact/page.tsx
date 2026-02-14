"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import Script from "next/script";
import { useSearchParams } from "next/navigation";
import { trackContactSubmit } from "@/lib/analytics";

const initialState = {
  type: "inquiry" as "inquiry" | "availability",
  name: "",
  email: "",
  message: "",
  company: "",
  service: "general",
  budget: "",
  availabilityStart: "",
  availabilityEnd: "",
  location: "",
  shootType: "",
};

const serviceOptions = [
  { label: "General inquiry", value: "general" },
  { label: "Hospitality Photography", value: "hospitality-photography" },
  {
    label: "Commercial Real Estate",
    value: "commercial-real-estate-photography",
  },
  { label: "Fashion Campaign", value: "fashion-campaign-photography" },
];

const serviceSlugMap: Record<string, string> = {
  hospitality: "hospitality-photography",
  "commercial-real-estate": "commercial-real-estate-photography",
  fashion: "fashion-campaign-photography",
};

const budgetOptions = [
  { label: "Budget range (optional)", value: "" },
  { label: "Under $5k", value: "under-5k" },
  { label: "$5k–$10k", value: "5k-10k" },
  { label: "$10k–$25k", value: "10k-25k" },
  { label: "$25k+", value: "25k-plus" },
];

const shootTypeOptions = [
  { label: "Select shoot type", value: "" },
  { label: "Hotel / Hospitality", value: "hospitality" },
  { label: "Commercial Real Estate", value: "commercial-real-estate" },
  { label: "Fashion / Editorial", value: "fashion" },
  { label: "Other", value: "other" },
];

export default function ContactPage() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  const selectedService = useMemo(
    () => searchParams.get("service") || "",
    [searchParams]
  );
  const selectedType = useMemo(
    () => searchParams.get("type") || "",
    [searchParams]
  );

  useEffect(() => {
    (window as Window & { onTurnstile?: (token: string) => void }).onTurnstile =
      (token: string) => {
        setTurnstileToken(token);
      };
    return () => {
      if ("onTurnstile" in window) {
        delete (window as Window & { onTurnstile?: (token: string) => void })
          .onTurnstile;
      }
    };
  }, []);

  useEffect(() => {
    if (selectedService) {
      const mappedService = serviceSlugMap[selectedService] || selectedService;
      setForm((prev) => ({ ...prev, service: mappedService }));
    }
  }, [selectedService]);

  useEffect(() => {
    if (selectedType === "availability") {
      setForm((prev) => ({ ...prev, type: "availability" }));
    }
  }, [selectedType]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");

    try {
      Sentry.addBreadcrumb({
        category: "contact",
        message: "Contact form submission started",
        level: "info",
      });

      if (siteKey && !turnstileToken) {
        throw new Error("Please complete the spam check.");
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          turnstileToken: siteKey ? turnstileToken : "",
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Request failed");
      }

      setForm((prev) => ({
        ...initialState,
        type: prev.type,
        service: prev.service,
      }));
      setStatus("sent");
      setTurnstileToken("");
      
      // Track successful submission
      trackContactSubmit({ type: form.type, service: form.service });

      Sentry.addBreadcrumb({
        category: "contact",
        message: "Contact form submission succeeded",
        level: "info",
      });
    } catch (err) {
      Sentry.addBreadcrumb({
        category: "contact",
        message: "Contact form submission failed",
        level: "error",
      });
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Contact
          </h1>
          <p className="mt-2 text-sm opacity-80">
            Share your project details and timeline.
          </p>
          <p className="mt-1 text-sm font-medium text-white/90">
            We respond within 24 hours.
          </p>
        </div>
      </section>

      <section className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8"
            aria-describedby="contact-status"
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: "inquiry" }))}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${
                  form.type === "inquiry"
                    ? "bg-white text-black"
                    : "border border-white/20 text-white/70"
                }`}
              >
                Project inquiry
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({ ...prev, type: "availability" }))
                }
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${
                  form.type === "availability"
                    ? "bg-white text-black"
                    : "border border-white/20 text-white/70"
                }`}
              >
                Check availability
              </button>
            </div>

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

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="company">
              Company (optional)
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="company"
              name="company"
              aria-invalid={status === "error"}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company or brand"
            />

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="service">
              Service
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="service"
              name="service"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
            >
              {serviceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {form.type === "availability" && (
              <>
                <label className="mt-4 block text-xs uppercase tracking-widest opacity-70">
                  Date range
                </label>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <input
                    className="w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm"
                    id="availabilityStart"
                    name="availabilityStart"
                    type="date"
                    aria-invalid={status === "error"}
                    value={form.availabilityStart}
                    onChange={(e) =>
                      setForm({ ...form, availabilityStart: e.target.value })
                    }
                    required
                  />
                  <input
                    className="w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm"
                    id="availabilityEnd"
                    name="availabilityEnd"
                    type="date"
                    aria-invalid={status === "error"}
                    value={form.availabilityEnd}
                    onChange={(e) =>
                      setForm({ ...form, availabilityEnd: e.target.value })
                    }
                    required
                  />
                </div>

                <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="location">
                  Location
                </label>
            <input
                    className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                  id="location"
                  name="location"
                  aria-invalid={status === "error"}
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="City, state"
                  required
                />

                <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="shootType">
                  Shoot type
                </label>
                <select
                  className="mt-2 w-full rounded border border-white/20 bg-black/60 px-3 py-2 text-sm"
                  id="shootType"
                  name="shootType"
                  value={form.shootType}
                  onChange={(e) => setForm({ ...form, shootType: e.target.value })}
                  required
                >
                  {shootTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </>
            )}

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
              {budgetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-xs uppercase tracking-widest opacity-70" htmlFor="message">
              {form.type === "availability" ? "Additional details (optional)" : "Project details"}
            </label>
            <textarea
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/60 px-4 py-3 text-sm focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              id="message"
              name="message"
              rows={5}
              aria-invalid={status === "error"}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Location, number of spaces, target launch date"
              required={form.type === "inquiry"}
            />

            <button
              type="submit"
              className="hover-border mt-6 inline-flex items-center justify-center rounded border border-white/25 px-6 py-3 text-xs uppercase tracking-widest hover:border-white/50"
              disabled={status === "sending" || (Boolean(siteKey) && !turnstileToken)}
            >
              {status === "sending" ? "Sending..." : "Send inquiry"}
            </button>

            <div id="contact-status" aria-live="polite">
              {!siteKey && (
                <p className="mt-3 text-xs uppercase tracking-widest text-amber-200">
                  Spam check is disabled (missing site key).
                </p>
              )}

              {siteKey && (
                <div
                  className="cf-turnstile mt-4"
                  data-sitekey={siteKey}
                  data-callback="onTurnstile"
                />
              )}

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
            <h2 className="mt-4 text-xl font-semibold tracking-wide">Let’s talk details.</h2>
            <p className="mt-2 text-sm opacity-80">
              Email or call to discuss timelines, scope, and usage needs.
            </p>
            <p className="mt-4 text-sm">hello@brightlinephotography.co</p>
            <p className="text-sm">+1 (212) 555-0139</p>
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
