"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PAGE_BACKGROUND_HUBS } from "@/lib/page-backgrounds";

type Hub = { key: string; label: string; path: string };

type Assignment = {
  pageKey: string;
  label: string;
  path: string;
  videoId: string;
  videoTitle: string;
  videoEnabled: boolean;
};

type VideoOption = { id: string; title: string; enabled: boolean };

const NESTED_KINDS = [
  { id: "blog", label: "Blog post", placeholder: "post-slug" },
  { id: "travel", label: "Travel post", placeholder: "trip-slug" },
  { id: "work", label: "Work pillar", placeholder: "architecture" },
  { id: "work-project", label: "Work project", placeholder: "project-slug" },
  { id: "services", label: "Service page", placeholder: "commercial" },
  { id: "design", label: "Design project", placeholder: "project-slug" },
] as const;

export default function PageAssignmentsPanel({
  videos,
}: {
  videos: VideoOption[];
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([...PAGE_BACKGROUND_HUBS]);
  const [mode, setMode] = useState<"hub" | "nested">("hub");
  const [hubKey, setHubKey] = useState("home");
  const [nestedKind, setNestedKind] = useState<(typeof NESTED_KINDS)[number]["id"]>("blog");
  const [nestedSlug, setNestedSlug] = useState("");
  const [videoId, setVideoId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/page-backgrounds", { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        assignments?: Assignment[];
        hubs?: Hub[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to load assignments.");
      setAssignments(data.assignments ?? []);
      if (data.hubs?.length) setHubs(data.hubs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assignments.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!videoId && videos[0]?.id) setVideoId(videos[0].id);
  }, [videos, videoId]);

  function buildPageKey(): string {
    if (mode === "hub") return hubKey;
    const slug = nestedSlug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) return "";
    return `${nestedKind}:${slug}`;
  }

  async function saveAssignment() {
    const pageKey = buildPageKey();
    if (!pageKey) {
      setError(mode === "nested" ? "Enter a slug for the page." : "Pick a page.");
      return;
    }
    if (!videoId) {
      setError("Pick a background video.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/page-backgrounds", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, videoId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed.");
      setStatus("Page assignment saved.");
      setNestedSlug("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function clearAssignment(pageKey: string) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch("/api/admin/page-backgrounds", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKey, videoId: null }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Clear failed.");
      setStatus("Assignment cleared.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed.");
    } finally {
      setBusy(false);
    }
  }

  const enabledVideos = videos.filter((v) => v.enabled);

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Page assignments</p>
      <p className="mt-2 max-w-2xl text-sm text-white/55">
        Assign a catalog clip to any hub or nested page (blog post, travel story, work project, …).
        That page plays the assigned video; the site-wide Live clip plays everywhere else.
      </p>

      {(error || status) && (
        <p className={`mt-4 text-sm ${error ? "text-rose-300" : "text-emerald-300/90"}`}>
          {error || status}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Page</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/70">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "hub"}
                onChange={() => setMode("hub")}
              />
              Hub
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={mode === "nested"}
                onChange={() => setMode("nested")}
              />
              Nested (slug)
            </label>
          </div>
          {mode === "hub" ? (
            <select
              value={hubKey}
              onChange={(e) => setHubKey(e.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {hubs.map((h) => (
                <option key={h.key} value={h.key}>
                  {h.label} ({h.path})
                </option>
              ))}
            </select>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                value={nestedKind}
                onChange={(e) =>
                  setNestedKind(e.target.value as (typeof NESTED_KINDS)[number]["id"])
                }
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              >
                {NESTED_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <input
                value={nestedSlug}
                onChange={(e) => setNestedSlug(e.target.value)}
                placeholder={
                  NESTED_KINDS.find((k) => k.id === nestedKind)?.placeholder ?? "slug"
                }
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </div>
          )}
        </div>
        <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
          Background video
          <select
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white"
          >
            {enabledVideos.length === 0 ? (
              <option value="">Add a video to the library first</option>
            ) : (
              enabledVideos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <button
        type="button"
        disabled={busy || enabledVideos.length === 0}
        onClick={() => void saveAssignment()}
        className="mt-5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/15 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Assign to page"}
      </button>

      <div className="mt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-white/45">Current assignments</p>
        {assignments.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">None yet — site Live plays on all pages.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {assignments.map((a) => (
              <li
                key={a.pageKey}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white">{a.label}</p>
                  <p className="truncate text-xs text-white/45">
                    <code className="text-white/55">{a.pageKey}</code>
                    {" · "}
                    {a.videoTitle}
                    {!a.videoEnabled ? " (disabled)" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={a.path}
                    className="rounded-lg border border-white/15 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/70"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void clearAssignment(a.pageKey)}
                    className="rounded-lg border border-rose-400/25 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-rose-200/90"
                  >
                    Clear
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
