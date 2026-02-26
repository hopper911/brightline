"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PILLARS, PILLAR_SLUGS } from "@/lib/portfolioPillars";

export default function AdminWorkNewPage() {
  const router = useRouter();
  const [pillar, setPillar] = useState<string>("architecture");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [published, setPublished] = useState(true);
  const [heroKeyFull, setHeroKeyFull] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/admin/work-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillar,
          title: title.trim(),
          slug: slug.trim() || undefined,
          summary: summary.trim() || undefined,
          location: location.trim() || undefined,
          year: year === "" ? undefined : Number(year),
          published,
          heroKeyFull: heroKeyFull.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; project?: { id: string }; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      if (data.project?.id) {
        router.push(`/admin/work/${data.project.id}`);
        return;
      }
      router.push("/admin/work");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <Link href="/admin/work" className="text-sm text-black/60 hover:underline">← Work projects</Link>
        <h1 className="mt-2 font-display text-2xl text-black">New work project</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-black/60">Pillar</label>
          <select
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
            className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
            required
          >
            {PILLAR_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {PILLARS.find((p) => p.slug === slug)?.label ?? slug}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-black/60">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
            placeholder="Project title"
            required
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-black/60">Slug (optional)</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
            placeholder="url-slug"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-black/60">Summary (optional)</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-black/60">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-black/60">Year (optional)</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm"
              min={1900}
              max={2100}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wide text-black/60">Hero image R2 key (optional)</label>
          <input
            type="text"
            value={heroKeyFull}
            onChange={(e) => setHeroKeyFull(e.target.value)}
            className="mt-1 w-full rounded border border-black/20 bg-white px-3 py-2 text-sm font-mono text-xs"
            placeholder="e.g. work/architecture/2026-02-23/full/arch-001.webp"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          Published
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
            {status === "saving" ? "Creating…" : "Create project"}
          </button>
          <Link href="/admin/work" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
