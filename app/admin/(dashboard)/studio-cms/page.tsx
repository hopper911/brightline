"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HubProject } from "@/lib/dual-brand/studio-hub";
import { distributionStatus } from "@/lib/dual-brand/studio-hub";

function Chip({ state }: { state: "off" | "draft" | "live" }) {
  const tone =
    state === "live"
      ? "text-emerald-300"
      : state === "draft"
        ? "text-amber-300"
        : "text-white/35";
  return <span className={tone}>{state}</span>;
}

export default function StudioCmsListPage() {
  const [projects, setProjects] = useState<HubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/studio-hub", { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        projects?: HubProject[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setProjects(data.projects || []);
    } catch (e) {
      setProjects([]);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteProject(project: HubProject) {
    const ok = window.confirm(
      `Delete “${project.title}”? This removes the Mirotech Work case study and any linked hub blog. This cannot be undone.`
    );
    if (!ok) return;
    setBusyId(project.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/studio-hub/${encodeURIComponent(project.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Delete failed");
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Studio CMS</h1>
          <p className="section-subtitle max-w-3xl">
            Dual-brand project hub — draft once, generate Brightline Work, Mirotech Work, and a Blog
            version from the same page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/studio-cms/new" className="btn btn-primary shrink-0">
            New project
          </Link>
          <Link href="/admin/projects" className="btn btn-ghost shrink-0">
            Legacy delivery projects
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-white/50">Loading hub projects…</p>
      ) : projects.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 px-6 py-10 text-center">
          <p className="text-white/70">No hub projects yet.</p>
          <Link href="/admin/studio-cms/new" className="btn btn-primary mt-4 inline-flex">
            Create first project
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Brightline</th>
                <th className="px-4 py-3 font-medium">Mirotech</th>
                <th className="px-4 py-3 font-medium">Blog</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {projects.map((p) => {
                const blog = (p.journalPosts || p.journalSummaries || [])[0];
                const dist = distributionStatus({
                  workStatus: p.status,
                  publishBrightline: p.publishBrightline,
                  publishMirotech: p.publishMirotech,
                  blogStatus: blog?.status,
                });
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="bg-black/20 hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{p.title}</div>
                      <div className="font-mono text-xs text-white/40">{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{p.status}</td>
                    <td className="px-4 py-3">
                      <Chip state={dist.brightlineWork} />
                    </td>
                    <td className="px-4 py-3">
                      <Chip state={dist.mirotechWork} />
                    </td>
                    <td className="px-4 py-3">
                      <Chip state={dist.blog} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/admin/studio-cms/${p.id}/preview`}
                          className="btn btn-ghost text-sm"
                        >
                          Preview
                        </Link>
                        <Link href={`/admin/studio-cms/${p.id}`} className="btn btn-ghost text-sm">
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost text-sm text-rose-300"
                          disabled={busy}
                          onClick={() => void deleteProject(p)}
                        >
                          {busy ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
