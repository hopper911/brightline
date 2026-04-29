"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type StudioListRow = {
  id: string;
  title: string;
  slug: string;
  client: string;
  category: string;
  location: string;
  year: number;
  published: boolean;
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string;
};

export default function AdminProjectsListPage() {
  const [projects, setProjects] = useState<StudioListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [legacyWorkCount, setLegacyWorkCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter === "published") params.set("published", "true");
      if (statusFilter === "draft") params.set("published", "false");
      const cat = categoryFilter.trim();
      if (cat) params.set("category", cat);
      const url = `/api/projects${params.toString() ? `?${params}` : ""}`;
      const [res, workRes] = await Promise.all([
        fetch(url, { credentials: "include" }),
        fetch("/api/admin/work-projects", { credentials: "include" }),
      ]);
      const data = (await res.json()) as { ok: boolean; projects?: StudioListRow[] };
      const workJson = (await workRes.json()) as { ok?: boolean; projects?: unknown[] };
      const wc =
        workJson.ok && Array.isArray(workJson.projects) ? workJson.projects.length : 0;
      setLegacyWorkCount(wc);
      if (res.ok && data.projects) setProjects(data.projects);
      else setProjects([]);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublish(id: string, next: boolean) {
    setBusyId(id);
    try {
      const res = await fetch("/api/projects/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, published: next }),
      });
      if (!res.ok) return;
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project page? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return;
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">Studio project pages</h1>
          <p className="section-subtitle max-w-3xl">
            Studio CMS — create, edit, and publish structured project content. When published, the
            public page is{" "}
            <span className="font-mono text-[0.9em] text-black/80">/work/your-slug</span> (not the
            legacy <span className="font-mono text-[0.9em] text-black/80">/work/pillar/slug</span>{" "}
            route). Matching categories also show on the pillar index.
          </p>
        </div>
        <Link href="/admin/projects/new" className="btn btn-primary shrink-0">
          Create project
        </Link>
      </div>

      {!loading && projects.length === 0 && legacyWorkCount > 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
          Your <strong>/work</strong> portfolio lives under{" "}
          <Link href="/admin/work" className="font-medium underline">
            Work projects
          </Link>{" "}
          (R2 media, pillars). Studio project pages here are a separate CMS — IDs are not interchangeable.
        </div>
      ) : null}

      <p className="mt-6 text-sm text-black/55">
        Customize the left admin menu (labels, URLs, what shows) under{" "}
        <Link href="/admin/navigation" className="font-medium text-sky-800 underline">
          Admin sidebar
        </Link>
        .
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <label className="text-xs uppercase tracking-[0.25em] text-black/50">
          Status
          <select
            className="ml-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-[0.25em] text-black/50">
          Category contains
          <input
            className="ml-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Filter…"
          />
        </label>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-black/60">Loading…</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/70 px-4 py-4"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                  {p.category}
                  {p.featured ? " · Featured" : ""}
                </p>
                <p className="text-lg text-black/90">{p.title}</p>
                <p className="text-sm text-black/70">
                  {p.client} · {p.year} · {p.location}
                </p>
                <p className="text-xs text-black/50">
                  {p.published ? (
                    <>
                      Published
                      {p.slug ? (
                        <>
                          {" "}
                          ·{" "}
                          <Link
                            href={`/work/${encodeURIComponent(p.slug)}`}
                            className="font-mono font-medium text-sky-800 underline decoration-sky-800/40 underline-offset-2 hover:text-sky-900"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            /work/{p.slug}
                          </Link>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      Draft
                      {p.slug ? (
                        <>
                          {" "}
                          · Public path{" "}
                          <span className="font-mono text-black/55">
                            /work/{p.slug}
                          </span>{" "}
                          after publishing
                        </>
                      ) : null}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/projects/${p.id}/edit`} className="btn btn-ghost text-sm">
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn btn-ghost text-sm"
                  disabled={busyId === p.id}
                  onClick={() => void togglePublish(p.id, !p.published)}
                >
                  {p.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-sm text-red-700"
                  disabled={busyId === p.id}
                  onClick={() => void deleteProject(p.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && projects.length === 0 ? (
        <p className="mt-8 text-sm text-black/60">No projects match filters.</p>
      ) : null}
    </div>
  );
}
