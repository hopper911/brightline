"use client";

import { useEffect, useMemo, useState } from "react";

type Tag = { id: string; name: string; slug: string };
type Client = { id: string; name: string };
type Project = {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  location?: string | null;
  year?: string | null;
  coverUrl?: string | null;
  featured: boolean;
  published: boolean;
  tags: { tag: Tag }[];
  client?: Client | null;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminProjectsPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [clientId, setClientId] = useState<string | "">("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const slug = useMemo(() => slugify(title || "project"), [title]);

  useEffect(() => {
    let active = true;
    async function load() {
      const [tagsRes, projectsRes] = await Promise.all([
        fetch("/api/admin/tags"),
        fetch("/api/admin/projects"),
      ]);

      if (!active) return;

      if (tagsRes.ok) {
        const data = (await tagsRes.json()) as { tags: Tag[] };
        setTags(data.tags || []);
      }

      if (projectsRes.ok) {
        const data = (await projectsRes.json()) as { projects: Project[] };
        setProjects(data.projects || []);
      }

      const clientsRes = await fetch("/api/admin/clients");
      if (clientsRes.ok) {
        const data = (await clientsRes.json()) as { items: { id: string; clientName: string }[] };
        setClients(
          (data.items || []).map((item) => ({ id: item.id, name: item.clientName }))
        );
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug,
            category: category || undefined,
            location: location || undefined,
            year: year || undefined,
            coverUrl: coverUrl || undefined,
            featured,
            clientId: clientId || null,
            tagIds: selectedTags,
          }),
      });

      const raw = await res.text();
      let data: { project?: Project; error?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        throw new Error(data?.error ?? `Save failed (${res.status}): ${raw.slice(0, 200)}`);
      }
      if (!data?.project) throw new Error("No project returned.");
      setProjects((prev) => [data.project!, ...prev]);
      setTitle("");
      setCategory("");
      setLocation("");
      setYear("");
      setCoverUrl("");
      setFeatured(false);
      setClientId("");
      setSelectedTags([]);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function togglePublished(project: Project) {
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !project.published }),
    });

    if (!res.ok) return;
    const data = (await res.json()) as { project: Project };
    setProjects((prev) =>
      prev.map((item) => (item.id === data.project.id ? data.project : item))
    );
  }

  async function toggleFeatured(project: Project) {
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !project.featured }),
    });

    if (!res.ok) return;
    const data = (await res.json()) as { project: Project };
    setProjects((prev) =>
      prev.map((item) => (item.id === data.project.id ? data.project : item))
    );
  }

  async function deleteProject(id: string) {
    const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setProjects((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">Admin · Projects</h1>
      <p className="section-subtitle">
        Create and publish project records for the new system.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6"
      >
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Project title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Cover image URL"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-black/60">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          Featured
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm">
            Slug: {slug}
          </div>
          <select
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-black/60">Tags</p>
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.id)}
                  onChange={(e) => {
                    setSelectedTags((prev) =>
                      e.target.checked
                        ? [...prev, tag.id]
                        : prev.filter((id) => id !== tag.id)
                    );
                  }}
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary" type="submit">
          {status === "saving" ? "Saving..." : "Create project"}
        </button>
        {status === "error" ? (
          <p className="text-sm text-red-600">Could not save project.</p>
        ) : null}
      </form>

      <div className="mt-10 space-y-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                  {project.category || "Project"}
                </p>
                <p className="text-lg text-black/80">{project.title}</p>
                <p className="text-xs text-black/50">/{project.slug}</p>
                {project.featured ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.3em] text-black/50">
                    Featured
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={() => togglePublished(project)}
                >
                  {project.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => toggleFeatured(project)}
                >
                  {project.featured ? "Unfeature" : "Feature"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => deleteProject(project.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
