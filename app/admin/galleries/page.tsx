"use client";

import { useEffect, useMemo, useState } from "react";

type Client = { id: string; name: string };
type Project = { id: string; title: string };
type Gallery = {
  id: string;
  title: string;
  slug: string;
  coverUrl?: string | null;
  published: boolean;
  client?: Client | null;
  project?: Project | null;
  accessTokens?: { id: string; token: string; expiresAt?: string | null }[];
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminGalleriesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [clientId, setClientId] = useState<string | "">("");
  const [projectId, setProjectId] = useState<string | "">("");
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Gallery[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const slug = useMemo(() => slugify(title || "gallery"), [title]);

  useEffect(() => {
    let active = true;
    async function load() {
      const [galleriesRes, projectsRes] = await Promise.all([
        fetch("/api/admin/galleries"),
        fetch("/api/admin/projects"),
      ]);

      if (!active) return;

      if (galleriesRes.ok) {
        const data = (await galleriesRes.json()) as { galleries: Gallery[] };
        setItems(data.galleries || []);
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
      const res = await fetch("/api/admin/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          description: description || undefined,
          coverUrl: coverUrl || undefined,
          clientId: clientId || null,
          projectId: projectId || null,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { gallery: Gallery };
      setItems((prev) => [data.gallery, ...prev]);
      setTitle("");
      setDescription("");
      setCoverUrl("");
      setClientId("");
      setProjectId("");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function togglePublished(item: Gallery) {
    const res = await fetch(`/api/admin/galleries/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { gallery: Gallery };
    setItems((prev) =>
      prev.map((g) => (g.id === data.gallery.id ? data.gallery : g))
    );
  }

  async function deleteGallery(id: string) {
    const res = await fetch(`/api/admin/galleries/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((prev) => prev.filter((g) => g.id !== id));
  }

  async function generateToken(galleryId: string) {
    const res = await fetch(`/api/admin/galleries/${galleryId}/token`, {
      method: "POST",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { token: string };
    setItems((prev) =>
      prev.map((g) =>
        g.id === galleryId
          ? {
              ...g,
              accessTokens: [
                { id: `token-${Date.now()}`, token: data.token },
                ...(g.accessTokens || []),
              ],
            }
          : g
      )
    );
  }

  async function revokeToken(galleryId: string, tokenId: string) {
    const res = await fetch(`/api/admin/galleries/${galleryId}/token`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId }),
    });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((g) =>
        g.id === galleryId
          ? {
              ...g,
              accessTokens: (g.accessTokens || []).filter((t) => t.id !== tokenId),
            }
          : g
      )
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">Admin · Galleries</h1>
      <p className="section-subtitle">Create client galleries and manage access.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6"
      >
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Gallery title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Cover image URL"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
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
          <select
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm">
          Slug: {slug}
        </div>
        <button className="btn btn-primary" type="submit">
          {status === "saving" ? "Saving..." : "Create gallery"}
        </button>
        {status === "error" ? (
          <p className="text-sm text-red-600">Could not save gallery.</p>
        ) : null}
      </form>

      <div className="mt-10 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-black/10 bg-white/70 px-4 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                  {item.client?.name || "Gallery"}
                </p>
                <p className="text-lg text-black/80">{item.title}</p>
                <p className="text-xs text-black/50">/{item.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={() => togglePublished(item)}
                >
                  {item.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => generateToken(item.id)}
                >
                  Generate token
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => deleteGallery(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {item.accessTokens?.length ? (
              <div className="mt-3 space-y-2 text-xs text-black/50">
                {item.accessTokens.map((token) => (
                  <div key={token.id} className="flex flex-wrap items-center gap-3">
                    <span>Token: {token.token}</span>
                    <button
                      className="btn btn-ghost"
                      onClick={() => revokeToken(item.id, token.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
