"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Service } from "@/app/services/data";
import { getPublicR2Url } from "@/lib/r2";
import R2BrowserModal, { type R2BrowserPick } from "../work/R2BrowserModal";
import { pickToStoredMediaRef } from "@/lib/r2-browser-prefixes";

type CaseStudyItem = Service["caseStudies"][number];
type R2Target = { itemIndex: number } | null;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function blankCaseStudy(index: number): CaseStudyItem {
  return {
    slug: `case-study-${index + 1}`,
    title: `Case study ${index + 1}`,
    category: "Commercial Photography",
    image: "",
    meta: "Location · Year",
  };
}

async function uploadSiteMedia(file: File) {
  const res = await fetch("/api/admin/site-media/upload-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: "services",
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
  if (!put.ok) throw new Error(`Storage upload failed (${put.status}).`);
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

export default function ServiceSectionsClient({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [selectedSlug, setSelectedSlug] = useState(initialServices[0]?.slug ?? "");
  const [r2Target, setR2Target] = useState<R2Target>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const selected = useMemo(
    () => services.find((service) => service.slug === selectedSlug) ?? services[0],
    [services, selectedSlug]
  );

  const otherServices = useMemo(
    () => services.filter((service) => service.slug !== selected?.slug),
    [services, selected]
  );

  function setDirty() {
    setStatus("idle");
  }

  function updateSelected(patch: Partial<Service>) {
    if (!selected) return;
    setServices((current) =>
      current.map((service) =>
        service.slug === selected.slug ? { ...service, ...patch } : service
      )
    );
    setDirty();
  }

  function updateCaseStudy(index: number, patch: Partial<CaseStudyItem>) {
    if (!selected) return;
    const items = [...selected.caseStudies];
    items[index] = { ...items[index], ...patch };
    updateSelected({ caseStudies: items });
  }

  function addCaseStudy() {
    if (!selected || selected.caseStudies.length >= 4) return;
    updateSelected({ caseStudies: [...selected.caseStudies, blankCaseStudy(selected.caseStudies.length)] });
  }

  function removeCaseStudy(index: number) {
    if (!selected) return;
    updateSelected({ caseStudies: selected.caseStudies.filter((_, i) => i !== index) });
  }

  function addRelatedLink(slug: string) {
    if (!selected) return;
    const target = services.find((service) => service.slug === slug);
    if (!target) return;
    const existing = selected.relatedServicesLinks ?? [];
    if (existing.some((link) => link.slug === slug)) return;
    updateSelected({
      relatedServicesLinks: [...existing, { slug: target.slug, title: target.title }],
    });
  }

  function removeRelatedLink(slug: string) {
    if (!selected) return;
    updateSelected({
      relatedServicesLinks: (selected.relatedServicesLinks ?? []).filter((link) => link.slug !== slug),
    });
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
      const json = (await res.json()) as { ok?: boolean; services?: Service[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      setServices(json.services ?? services);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  }

  async function useR2Keys(picks: R2BrowserPick[]) {
    const keys = picks.map(pickToStoredMediaRef);
    if (!selected || r2Target === null) return;
    const url = keys.map(getPublicR2Url).filter(Boolean)[0];
    if (!url) return;
    updateCaseStudy(r2Target.itemIndex, { image: url });
    setR2Target(null);
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/70">
        No service pages found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <R2BrowserModal
        isOpen={r2Target !== null}
        onClose={() => setR2Target(null)}
        onAddKeys={useR2Keys}
        mode="single"
        mediaRoot="portfolio"
        initialPortfolioFolder="web_full"
        confirmLabel="Use selected"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Service pages</p>
          <h1 className="mt-2 font-display text-4xl text-white">Service sections</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Edit the case study cards and related services block at the bottom of each{" "}
            <code className="text-white/80">/services/…</code> page. Turn either section off without
            touching the rest of the page.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/services/${selected.slug}`} className="btn btn-ghost">
            View live
          </Link>
          <Link href="/admin/services" className="btn btn-ghost">
            Full service editor
          </Link>
          <button className="btn btn-primary" type="button" disabled={status === "saving"} onClick={() => void save()}>
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {status === "saved" ? <p className="mt-4 text-sm text-emerald-300">Saved.</p> : null}

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {services.map((service) => (
          <button
            key={service.slug}
            type="button"
            onClick={() => setSelectedSlug(service.slug)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              service.slug === selectedSlug
                ? "border-white bg-white text-black"
                : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
            }`}
          >
            {service.title}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.caseStudiesEnabled !== false}
              onChange={(event) => updateSelected({ caseStudiesEnabled: event.target.checked })}
            />
            <span>
              <strong className="text-white">Show case studies section</strong>
              <span className="mt-1 block text-sm text-white/60">
                Displays up to two project cards above FAQs on this service page.
              </span>
            </span>
          </label>

          {selected.caseStudiesEnabled !== false ? (
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-white/70">
                Section intro
                <input
                  value={selected.caseStudiesIntro ?? ""}
                  onChange={(event) => updateSelected({ caseStudiesIntro: event.target.value })}
                  placeholder="Explore related projects and outcomes."
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Case study cards</p>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={selected.caseStudies.length >= 4}
                  onClick={addCaseStudy}
                >
                  Add card
                </button>
              </div>

              {selected.caseStudies.map((item, index) => (
                <article
                  key={`${item.slug}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/25 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                      Card {index + 1}
                      {index < 2 ? " · shows on page" : " · backup (hidden after first 2)"}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-red-300/80 underline"
                      onClick={() => removeCaseStudy(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[140px_1fr]">
                    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center px-2 text-center text-xs text-white/40">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm text-white/70">
                        Title
                        <input
                          value={item.title}
                          onChange={(event) => updateCaseStudy(index, { title: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="block text-sm text-white/70">
                        Category label
                        <input
                          value={item.category}
                          onChange={(event) => updateCaseStudy(index, { category: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="block text-sm text-white/70">
                        Meta (location · year)
                        <input
                          value={item.meta}
                          onChange={(event) => updateCaseStudy(index, { meta: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </label>
                      <label className="block text-sm text-white/70">
                        Slug (internal)
                        <input
                          value={item.slug}
                          onChange={(event) => updateCaseStudy(index, { slug: slugify(event.target.value) })}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                        />
                      </label>
                      <label className="block text-sm text-white/70 sm:col-span-2">
                        Link URL (optional — e.g. /work/architecture/project-slug)
                        <input
                          value={item.href ?? ""}
                          onChange={(event) => updateCaseStudy(index, { href: event.target.value })}
                          placeholder="/work/architecture/your-project"
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                        />
                      </label>
                      <label className="block text-sm text-white/70 sm:col-span-2">
                        Image / video URL
                        <input
                          value={item.image}
                          onChange={(event) => updateCaseStudy(index, { image: event.target.value })}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button
                          type="button"
                          className="btn btn-ghost text-xs"
                          onClick={() => setR2Target({ itemIndex: index })}
                        >
                          Choose from R2
                        </button>
                        <label className="btn btn-ghost cursor-pointer text-xs">
                          Upload
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              void uploadSiteMedia(file)
                                .then((url) => updateCaseStudy(index, { image: url }))
                                .catch((err) => setError(err instanceof Error ? err.message : "Upload failed."));
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.relatedServicesEnabled !== false}
              onChange={(event) => updateSelected({ relatedServicesEnabled: event.target.checked })}
            />
            <span>
              <strong className="text-white">Show related services section</strong>
              <span className="mt-1 block text-sm text-white/60">
                Cross-links to other service pages, shown between case studies and FAQs.
              </span>
            </span>
          </label>

          {selected.relatedServicesEnabled !== false ? (
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-white/70">
                Intro copy
                <textarea
                  value={selected.relatedServicesIntro ?? ""}
                  onChange={(event) => updateSelected({ relatedServicesIntro: event.target.value })}
                  rows={3}
                  placeholder="Short line explaining how other services connect."
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>

              <label className="flex items-center gap-3 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={selected.showRelatedContactButton !== false}
                  onChange={(event) => updateSelected({ showRelatedContactButton: event.target.checked })}
                />
                Show Contact button in this block
              </label>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Linked services</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selected.relatedServicesLinks ?? []).map((link) => (
                    <span
                      key={link.slug}
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-sm text-white/80"
                    >
                      {link.title}
                      <button
                        type="button"
                        className="text-white/45 hover:text-white"
                        onClick={() => removeRelatedLink(link.slug)}
                        aria-label={`Remove ${link.title}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {(selected.relatedServicesLinks ?? []).length === 0 ? (
                    <p className="text-sm text-white/50">No links yet — add a service below.</p>
                  ) : null}
                </div>
              </div>

              {otherServices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {otherServices.map((service) => (
                    <button
                      key={service.slug}
                      type="button"
                      className="btn btn-ghost text-xs"
                      disabled={(selected.relatedServicesLinks ?? []).some((link) => link.slug === service.slug)}
                      onClick={() => addRelatedLink(service.slug)}
                    >
                      + {service.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
