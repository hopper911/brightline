"use client";

import { useEffect, useMemo, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import Script from "next/script";
import PrimaryCTA from "@/components/PrimaryCTA";
import { useSearchParams } from "next/navigation";

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

      if (!turnstileToken) {
        throw new Error("Please complete the spam check.");
      }

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
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
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Get in touch
          </p>
          <h1 className="section-title mt-2">Contact</h1>
          <p className="section-subtitle mt-2 max-w-xl">
            Share your project details and timeline. We reply within 24 hours with
            availability and a tailored scope.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-white/10 bg-black/40 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] md:p-8"
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

            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="name">
                  Name
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  id="name"
                  name="name"
                  aria-invalid={status === "error"}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="email">
                  Email
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  id="email"
                  name="email"
                  type="email"
                  aria-invalid={status === "error"}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="company">
                  Company (optional)
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  id="company"
                  name="company"
                  aria-invalid={status === "error"}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company or brand"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="service">
                  Service
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#0b0e12]"
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
              </div>
            </div>

            {form.type === "availability" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-[0.28em] text-white/60">
                    Date range
                  </label>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
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
                      className="w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
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
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="location">
                    Location
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                    id="location"
                    name="location"
                    aria-invalid={status === "error"}
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City, state"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="shootType">
                    Shoot type
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#0b0e12]"
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
                </div>
              </div>
            )}

            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="budget">
                  Budget range
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 [&>option]:bg-[#0b0e12]"
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
              </div>

              <div>
                <label className="block text-xs uppercase tracking-[0.28em] text-white/60" htmlFor="message">
                  {form.type === "availability" ? "Additional details (optional)" : "Project details"}
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-white/20 bg-black/60 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                  id="message"
                  name="message"
                  rows={5}
                  aria-invalid={status === "error"}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Location, number of spaces, target launch date"
                  required={form.type === "inquiry"}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-light mt-8 w-full md:w-auto"
              disabled={status === "sending" || !turnstileToken}
            >
              {status === "sending" ? "Sending..." : "Send inquiry"}
            </button>

            <div id="contact-status" aria-live="polite">
              {!siteKey && (
                <p className="mt-3 text-xs uppercase tracking-widest text-red-300">
                  Turnstile site key missing.
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

          <div className="rounded-[28px] border border-white/10 bg-black/40 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] md:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-white/60">Studio contact</p>
            <h2 className="font-display mt-4 text-xl md:text-2xl text-white tracking-wide">
              Let’s talk details.
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Email or call to discuss timelines, scope, and usage needs.
            </p>
            <a
              href="mailto:hello@brightlinephotography.co"
              className="mt-5 block text-sm text-white/90 hover:text-white transition-colors"
            >
              hello@brightlinephotography.co
            </a>
            <p className="mt-1 text-sm text-white/70">+1 (212) 555-0139</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <PrimaryCTA service="general" className="btn btn-light" />
              <Link href="/portfolio" className="btn btn-outline-light">
                View portfolio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
