"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Service } from "@/app/services/data";
import { getPublicR2Url } from "@/lib/r2";
import R2BrowserModal, { type R2BrowserPick } from "../work/R2BrowserModal";
import { pickToStoredMediaRef } from "@/lib/r2-browser-prefixes";

type Props = {
  initialServices: Service[];
};

type R2Target = "heroImage" | "heroVideo" | "proofImages" | "caseStudies";
type BackgroundTarget = "backgroundMediaUrl" | "backgroundPosterUrl";

function linesToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function newService(slug: string): Service {
  return {
    slug,
    title: "New Service Page",
    summary: "Short service summary.",
    description: "Describe this service page.",
    overview: ["Describe how this service works, who it is for, and how the final assets are used."],
    serviceDetails: [
      {
        title: "Service detail",
        body: "Explain a specific part of the service in more depth.",
      },
    ],
    bestFor: ["Ideal client or project type"],
    heroTagline: "Short positioning line.",
    portfolioLabel: "View portfolio",
    portfolioHref: "/work",
    heroImage: "/images/hero.jpg",
    heroVideo: "",
    backgroundMediaUrl: "",
    backgroundPosterUrl: "",
    proofImages: ["/images/hero.jpg"],
    industries: ["Industry"],
    deliverables: ["Deliverable"],
    process: ["Process step"],
    pricing: {
      label: "Starting at",
      range: "Custom quote",
      disclaimer: "Pricing depends on scope.",
      licensing: "Usage and licensing quoted by project.",
    },
    faqs: [{ q: "Question?", a: "Answer." }],
    caseStudies: [],
    caseStudiesEnabled: true,
    caseStudiesIntro: "Explore related projects and outcomes.",
    relatedServicesEnabled: true,
    relatedServicesIntro: "",
    relatedServicesLinks: [],
    showRelatedContactButton: true,
  };
}

function arrayToLines(value: string[]) {
  return value.join("\n");
}

function faqToLines(value: Service["faqs"]) {
  return value.map((faq) => `${faq.q} | ${faq.a}`).join("\n");
}

function linesToFaq(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [q, ...rest] = line.split("|");
      const question = q?.trim();
      const answer = rest.join("|").trim();
      return question && answer ? { q: question, a: answer } : null;
    })
    .filter(Boolean) as Service["faqs"];
}

function caseStudiesToLines(value: Service["caseStudies"]) {
  return value
    .map((item) => `${item.slug} | ${item.title} | ${item.category} | ${item.image} | ${item.meta}`)
    .join("\n");
}

function linesToCaseStudies(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [slug, title, category = "", image = "", meta = ""] = line
        .split("|")
        .map((part) => part.trim());
      return slug && title ? { slug, title, category, image, meta } : null;
    })
    .filter(Boolean) as Service["caseStudies"];
}

async function uploadSiteMedia(file: File, folder = "services") {
  const res = await fetch("/api/admin/site-media/upload-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    url?: string;
    key?: string;
    publicUrl?: string;
    headers?: Record<string, string>;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.url || !data.key) {
    throw new Error(data.error ?? "Could not prepare upload.");
  }
  const put = await fetch(data.url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream", ...(data.headers ?? {}) },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Storage upload failed (${put.status}).`);
  }
  const finalizeRes = await fetch("/api/admin/site-media/finalize", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: data.key }),
  });
  const finalized = (await finalizeRes.json()) as { ok?: boolean; publicUrl?: string; error?: string };
  if (!finalizeRes.ok || !finalized.ok || !finalized.publicUrl) {
    throw new Error(finalized.error ?? "Upload finalization failed.");
  }
  return finalized.publicUrl;
}

export default function ServicePagesClient({ initialServices }: Props) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [selectedSlug, setSelectedSlug] = useState(initialServices[0]?.slug ?? "");
  const [r2Target, setR2Target] = useState<R2Target | null>(null);
  const [r2BackgroundTarget, setR2BackgroundTarget] = useState<BackgroundTarget | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => services.find((service) => service.slug === selectedSlug) ?? services[0],
    [selectedSlug, services]
  );

  function updateSelected(patch: Partial<Service>) {
    if (!selected) return;
    setServices((current) =>
      current.map((service) =>
        service.slug === selected.slug ? { ...service, ...patch } : service
      )
    );
  }

  function addService() {
    const title = prompt("Service page title?");
    if (!title) return;
    const base = slugify(title) || "new-service";
    let slug = base;
    let i = 2;
    while (services.some((service) => service.slug === slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    const next = newService(slug);
    next.title = title.trim();
    setServices((current) => [...current, next]);
    setSelectedSlug(slug);
    setStatus("idle");
  }

  function deleteSelected() {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}" from public services? Save changes after deleting.`)) {
      return;
    }
    const next = services.filter((service) => service.slug !== selected.slug);
    setServices(next);
    setSelectedSlug(next[0]?.slug ?? "");
    setStatus("idle");
  }

  function updatePricing(patch: Partial<Service["pricing"]>) {
    if (!selected) return;
    updateSelected({ pricing: { ...selected.pricing, ...patch } });
  }

  async function useR2Keys(picks: R2BrowserPick[]) {
    const keys = picks.map(pickToStoredMediaRef);
    if (!selected || !r2Target) return;
    const urls = keys.map(getPublicR2Url).filter(Boolean);
    if (urls.length === 0) return;

    if (r2Target === "heroImage") {
      updateSelected({ heroImage: urls[0] ?? "" });
      return;
    }
    if (r2Target === "heroVideo") {
      updateSelected({ heroVideo: urls[0] ?? "" });
      return;
    }
    if (r2Target === "proofImages") {
      updateSelected({ proofImages: [...selected.proofImages, ...urls] });
      return;
    }

    updateSelected({
      caseStudies: [
        ...selected.caseStudies,
        ...urls.map((url, index) => ({
          slug: `r2-media-${selected.caseStudies.length + index + 1}`,
          title: "Related work",
          category: selected.title,
          image: url,
          meta: "Update this caption.",
        })),
      ],
    });
  }

  async function useBackgroundR2Key(picks: R2BrowserPick[]) {
    const keys = picks.map(pickToStoredMediaRef);
    if (!selected || !r2BackgroundTarget) return;
    const url = keys.map(getPublicR2Url).find(Boolean);
    if (!url) return;
    updateSelected({ [r2BackgroundTarget]: url } as Partial<Service>);
    setR2BackgroundTarget(null);
  }

  async function uploadSelectedMedia(file: File, target: "heroImage" | "heroVideo") {
    setStatus("saving");
    setError("");
    try {
      const publicUrl = await uploadSiteMedia(file, "services");
      updateSelected({ [target]: publicUrl } as Partial<Service>);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function uploadBackgroundMedia(file: File, target: BackgroundTarget) {
    setStatus("saving");
    setError("");
    try {
      const publicUrl = await uploadSiteMedia(file, "services");
      updateSelected({ [target]: publicUrl } as Partial<Service>);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function uploadProofMedia(files: FileList | null) {
    if (!selected || !files?.length) return;
    setStatus("saving");
    setError("");
    try {
      const urls = await Promise.all(Array.from(files).map((file) => uploadSiteMedia(file, "services")));
      updateSelected({ proofImages: [...selected.proofImages, ...urls] });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function uploadCaseStudyMedia(files: FileList | null) {
    if (!selected || !files?.length) return;
    setStatus("saving");
    setError("");
    try {
      const urls = await Promise.all(Array.from(files).map((file) => uploadSiteMedia(file, "services")));
      updateSelected({
        caseStudies: [
          ...selected.caseStudies,
          ...urls.map((url, index) => ({
            slug: `uploaded-media-${selected.caseStudies.length + index + 1}`,
            title: "Related work",
            category: selected.title,
            image: url,
            meta: "Update this caption.",
          })),
        ],
      });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/admin/service-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ services }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        services?: Service[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      setServices(json.services ?? services);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="font-display text-4xl text-white">Service Pages</h1>
        <p className="mt-4 text-white/60">No service pages are configured.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <R2BrowserModal
        isOpen={r2Target !== null}
        onClose={() => setR2Target(null)}
        onAddKeys={useR2Keys}
        mode={r2Target === "proofImages" || r2Target === "caseStudies" ? "multiple" : "single"}
        mediaRoot="portfolio"
        initialPortfolioFolder="web_full"
      />
      <R2BrowserModal
        isOpen={r2BackgroundTarget !== null}
        onClose={() => setR2BackgroundTarget(null)}
        onAddKeys={useBackgroundR2Key}
        mode="single"
        mediaRoot="portfolio"
        initialPortfolioFolder={
          r2BackgroundTarget === "backgroundMediaUrl" ? "web_video" : "web_full"
        }
        confirmLabel="Use selected"
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Public site</p>
          <h1 className="mt-2 font-display text-4xl text-white">Service pages</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Edit the public service pages shown under <code>/services</code>. Changes are manual
            only and save as site settings, with the original code content kept as fallback.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-ghost" type="button" onClick={addService}>
            Add service
          </button>
          <button className="btn btn-ghost" type="button" onClick={deleteSelected}>
            Delete selected
          </button>
          <Link href={`/services/${selected.slug}`} className="btn btn-ghost">
            View live
          </Link>
          <button className="btn btn-primary" disabled={status === "saving"} onClick={() => void save()}>
            {status === "saving" ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : status === "saved" ? (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Service page content saved.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {services.map((service) => (
          <button
            key={service.slug}
            type="button"
            onClick={() => setSelectedSlug(service.slug)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em] ${
              service.slug === selected.slug
                ? "border-white/50 bg-white text-black"
                : "border-white/15 bg-white/5 text-white/70 hover:border-white/35"
            }`}
          >
            {service.title}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">Core copy</h2>
          <label className="block text-sm text-white/70">
            Slug
            <input
              value={selected.slug}
              onChange={(event) => {
                const nextSlug = slugify(event.target.value);
                if (!nextSlug) return;
                setServices((current) =>
                  current.map((service) =>
                    service.slug === selected.slug ? { ...service, slug: nextSlug } : service
                  )
                );
                setSelectedSlug(nextSlug);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Title
            <input
              value={selected.title}
              onChange={(event) => updateSelected({ title: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Summary
            <textarea
              value={selected.summary}
              onChange={(event) => updateSelected({ summary: event.target.value })}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Hero description
            <textarea
              value={selected.description}
              onChange={(event) => updateSelected({ description: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Hero tagline
            <input
              value={selected.heroTagline}
              onChange={(event) => updateSelected({ heroTagline: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">Media and CTA</h2>
          <label className="block text-sm text-white/70">
            Portfolio button label
            <input
              value={selected.portfolioLabel}
              onChange={(event) => updateSelected({ portfolioLabel: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Portfolio button URL
            <input
              value={selected.portfolioHref}
              onChange={(event) => updateSelected({ portfolioHref: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Hero image path or URL
            <input
              value={selected.heroImage}
              onChange={(event) => updateSelected({ heroImage: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target("heroImage")}>
              Choose image from R2
            </button>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSelectedMedia(file, "heroImage");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="block text-sm text-white/70">
            Hero video URL
            <input
              value={selected.heroVideo ?? ""}
              onChange={(event) => updateSelected({ heroVideo: event.target.value })}
              placeholder="Optional .mp4, .webm, or .mov background"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target("heroVideo")}>
              Choose video from R2
            </button>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mov,.m4v"
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSelectedMedia(file, "heroVideo");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="block text-sm text-white/70">
            Page background image/video
            <input
              value={selected.backgroundMediaUrl ?? ""}
              onChange={(event) => updateSelected({ backgroundMediaUrl: event.target.value })}
              placeholder="Optional full-page background"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2BackgroundTarget("backgroundMediaUrl")}>
              Choose background from R2
            </button>
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadBackgroundMedia(file, "backgroundMediaUrl");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="block text-sm text-white/70">
            Page background video poster
            <input
              value={selected.backgroundPosterUrl ?? ""}
              onChange={(event) => updateSelected({ backgroundPosterUrl: event.target.value })}
              placeholder="Optional poster for video backgrounds"
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2BackgroundTarget("backgroundPosterUrl")}>
              Choose poster from R2
            </button>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadBackgroundMedia(file, "backgroundPosterUrl");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="block text-sm text-white/70">
            Proof gallery media, one per line
            <textarea
              value={arrayToLines(selected.proofImages)}
              onChange={(event) => updateSelected({ proofImages: linesToArray(event.target.value) })}
              rows={4}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target("proofImages")}>
              Add proof media from R2
            </button>
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
              multiple
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                void uploadProofMedia(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">Lists</h2>
          <label className="block text-sm text-white/70">
            Industries served, one per line
            <textarea
              value={arrayToLines(selected.industries)}
              onChange={(event) => updateSelected({ industries: linesToArray(event.target.value) })}
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Deliverables, one per line
            <textarea
              value={arrayToLines(selected.deliverables)}
              onChange={(event) => updateSelected({ deliverables: linesToArray(event.target.value) })}
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Process, one per line
            <textarea
              value={arrayToLines(selected.process)}
              onChange={(event) => updateSelected({ process: linesToArray(event.target.value) })}
              rows={5}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">Pricing</h2>
          <label className="block text-sm text-white/70">
            Pricing label
            <input
              value={selected.pricing.label}
              onChange={(event) => updatePricing({ label: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Pricing range
            <input
              value={selected.pricing.range}
              onChange={(event) => updatePricing({ range: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Pricing disclaimer
            <textarea
              value={selected.pricing.disclaimer}
              onChange={(event) => updatePricing({ disclaimer: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm text-white/70">
            Licensing copy
            <textarea
              value={selected.pricing.licensing}
              onChange={(event) => updatePricing({ licensing: event.target.value })}
              rows={4}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
        </section>
      </div>

        <section className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">FAQ and related work</h2>
          <Link href="/admin/service-sections" className="text-xs uppercase tracking-[0.18em] text-white/55 underline hover:text-white">
            Case studies & related services →
          </Link>
        </div>
        <label className="block text-sm text-white/70">
          FAQs, one per line as <code>Question | Answer</code>
          <textarea
            value={faqToLines(selected.faqs)}
            onChange={(event) => updateSelected({ faqs: linesToFaq(event.target.value) })}
            rows={6}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white"
          />
        </label>
        <label className="block text-sm text-white/70">
          Case studies, one per line as <code>slug | title | category | image/video | meta</code>
          <textarea
            value={caseStudiesToLines(selected.caseStudies)}
            onChange={(event) =>
              updateSelected({ caseStudies: linesToCaseStudies(event.target.value) })
            }
            rows={5}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white"
          />
          <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target("caseStudies")}>
            Add related media from R2
          </button>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
            multiple
            className="mt-2 block w-full text-xs text-white/55"
            onChange={(event) => {
              void uploadCaseStudyMedia(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </section>
    </div>
  );
}
