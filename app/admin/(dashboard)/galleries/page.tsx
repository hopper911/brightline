"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import R2BrowserModal, { type R2BrowserPick } from "@/components/admin/R2BrowserModal";
import { pickToStoredMediaRef } from "@/lib/r2-browser-prefixes";

type Client = { id: string; name: string };
type Project = { id: string; title: string };
type ImageMeta = {
  usageType?: string | null;
  licenseExpiration?: string | null;
  [k: string]: unknown;
} | null;
type Gallery = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  deliveryDriveLink?: string | null;
  usageGuideText?: string | null;
  deliveredAt?: string | null;
  published: boolean;
  status?: string;
  galleryType?: string;
  client?: Client | null;
  project?: Project | null;
  images?: { meta?: ImageMeta }[];
  accessTokens?: {
    id: string;
    codeHint?: string | null;
    isActive?: boolean;
    expiresAt?: string | null;
  }[];
};

type R2CoverTarget = "createCover" | "editCover" | null;

/** Ensures session cookies are sent for same-origin admin API calls. */
function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const STATUS_OPTIONS = [
  "DRAFT",
  "READY_TO_SEND",
  "SENT",
  "CLIENT_REVIEWING",
  "SELECTIONS_RECEIVED",
  "FINALIZED",
  "DELIVERED",
  "EXPIRED",
  "ARCHIVED",
] as const;

const TYPE_OPTIONS = [
  "PROOF",
  "SELECTION",
  "FINAL_DELIVERY",
  "INTERNAL_REVIEW",
] as const;

export default function AdminGalleriesPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [deliveryDriveLink, setDeliveryDriveLink] = useState("");
  const [usageGuideText, setUsageGuideText] = useState("");
  const [galleryType, setGalleryType] = useState("PROOF");
  const [galleryStatus, setGalleryStatus] = useState("DRAFT");
  const [clientId, setClientId] = useState<string | "">("");
  const [projectId, setProjectId] = useState<string | "">("");
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<Gallery[]>([]);
  const [viewFilter, setViewFilter] = useState<"all" | "deliveries">("all");
  const [lastGeneratedToken, setLastGeneratedToken] = useState<string | null>(null);
  const [lastGeneratedTokenGalleryId, setLastGeneratedTokenGalleryId] = useState<string | null>(null);
  const [showRevokedAccessHistory, setShowRevokedAccessHistory] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [r2CoverTarget, setR2CoverTarget] = useState<R2CoverTarget>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Gallery | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    slug: "",
    description: "",
    coverUrl: "",
    published: false,
    status: "DRAFT",
    galleryType: "PROOF",
    clientId: "",
    projectId: "",
    deliveryDriveLink: "",
    usageGuideText: "",
  });

  const slug = useMemo(() => slugify(title || "gallery"), [title]);

  async function resolvePublicUrl(key: string) {
    const res = await adminFetch("/api/admin/public-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const raw = await res.text();
    let data: { url?: string; error?: string } | null = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // The raw response is included in the thrown error below for debugging.
    }
    if (!res.ok || !data?.url) {
      throw new Error(
        data?.error ?? `Unable to resolve public URL (${res.status}): ${raw.slice(0, 200)}`
      );
    }
    return data.url;
  }

  async function handleR2CoverKeys(picks: R2BrowserPick[]) {
    const key = picks[0] ? pickToStoredMediaRef(picks[0]).replace(/^\/+/, "") : "";
    if (!key) return;
    const url = await resolvePublicUrl(key);
    if (r2CoverTarget === "editCover") {
      setEditForm((prev) => ({ ...prev, coverUrl: url }));
    } else {
      setCoverUrl(url);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      const [galleriesRes, projectsRes] = await Promise.all([
        fetch("/api/admin/galleries", { credentials: "include" }),
        fetch("/api/admin/projects", { credentials: "include" }),
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

      const clientsRes = await fetch("/api/admin/client-list", {
        credentials: "include",
      });
      if (clientsRes.ok) {
        const data = (await clientsRes.json()) as {
          clients: { id: string; name: string }[];
        };
        setClients(data.clients || []);
      }
    }

    

    load();
    return () => {
      active = false;
    };
  }, []);

  function openEditModal(g: Gallery) {
    setEditError(null);
    setEditing(g);
    setEditForm({
      title: g.title || "",
      slug: g.slug || "",
      description: (g.description ?? "") as string,
      coverUrl: (g.coverUrl ?? "") as string,
      published: Boolean(g.published),
      status: (g.status || "DRAFT") as string,
      galleryType: (g.galleryType || "PROOF") as string,
      clientId: (g.client?.id ?? "") as string,
      projectId: (g.project?.id ?? "") as string,
      deliveryDriveLink: (g.deliveryDriveLink ?? "") as string,
      usageGuideText: (g.usageGuideText ?? "") as string,
    });
    setEditOpen(true);
  }

  function closeEditModal() {
    setEditOpen(false);
    setEditSaving(false);
    setEditError(null);
    setEditing(null);
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/galleries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: editForm.title.trim(),
          slug: editForm.slug.trim(),
          description: editForm.description.trim() || null,
          coverUrl: editForm.coverUrl.trim() || null,
          published: Boolean(editForm.published),
          status: editForm.status,
          galleryType: editForm.galleryType,
          clientId: editForm.clientId || null,
          projectId: editForm.projectId || null,
          deliveryDriveLink: editForm.deliveryDriveLink.trim() || null,
          usageGuideText: editForm.usageGuideText.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; gallery?: Gallery; error?: string };
      if (!res.ok) throw new Error(data.error || "Update failed");
      if (!data.gallery) throw new Error("Update failed");
      setItems((prev) => prev.map((g) => (g.id === data.gallery!.id ? data.gallery! : g)));
      closeEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed");
      setEditSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    try {
      const res = await fetch("/api/admin/galleries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          slug,
          description: description || undefined,
          coverUrl: coverUrl || undefined,
          deliveryDriveLink: deliveryDriveLink || undefined,
          usageGuideText: usageGuideText || undefined,
          status: galleryStatus,
          galleryType,
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
      setDeliveryDriveLink("");
      setUsageGuideText("");
      setGalleryType("PROOF");
      setGalleryStatus("DRAFT");
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
      credentials: "include",
      body: JSON.stringify({ published: !item.published }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { gallery: Gallery };
    setItems((prev) =>
      prev.map((g) => (g.id === data.gallery.id ? data.gallery : g))
    );
  }

  async function deleteGallery(id: string) {
    const res = await fetch(`/api/admin/galleries/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) return;
    setItems((prev) => prev.filter((g) => g.id !== id));
  }

  async function generateToken(galleryId: string) {
    const gallery = items.find((item) => item.id === galleryId);
    const res = await fetch(`/api/admin/galleries/${galleryId}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        allowDownload: gallery?.galleryType === "FINAL_DELIVERY" ? true : undefined,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { token?: string; gallery?: Gallery; error?: string };
    if (!data.token) return;
    setLastGeneratedToken(data.token);
    setLastGeneratedTokenGalleryId(galleryId);
    if (data.gallery) {
      setItems((prev) => prev.map((g) => (g.id === data.gallery!.id ? data.gallery! : g)));
    } else {
      const galleriesRes = await fetch("/api/admin/galleries", {
        credentials: "include",
      });
      if (galleriesRes.ok) {
        const json = (await galleriesRes.json()) as { galleries: Gallery[] };
        setItems(json.galleries || []);
      }
    }
  }

  async function revokeToken(galleryId: string, tokenId: string) {
    const res = await fetch(`/api/admin/galleries/${galleryId}/token`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tokenId }),
    });
    if (!res.ok) return;
    setItems((prev) =>
      prev.map((g) =>
        g.id === galleryId
          ? {
              ...g,
              accessTokens: (g.accessTokens || []).map((t) =>
                t.id === tokenId ? { ...t, isActive: false } : t
              ),
            }
          : g
      )
    );
  }

  async function markDelivered(item: Gallery) {
    const deliveredAt = new Date().toISOString();
    const res = await fetch(`/api/admin/galleries/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        status: "DELIVERED",
        deliveredAt: item.deliveredAt || deliveredAt,
        sentAt: item.deliveredAt || deliveredAt,
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { gallery: Gallery };
    setItems((prev) =>
      prev.map((g) => (g.id === data.gallery.id ? data.gallery : g))
    );
  }

  const visibleItems =
    viewFilter === "deliveries"
      ? items.filter((item) => item.galleryType === "FINAL_DELIVERY")
      : items;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="section-title">Admin · Galleries</h1>
      <p className="section-subtitle">Create client galleries and manage access.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn ${viewFilter === "all" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setViewFilter("all")}
        >
          All galleries
        </button>
        <button
          type="button"
          className={`btn ${viewFilter === "deliveries" ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setViewFilter("deliveries")}
        >
          Deliveries
        </button>
      </div>

      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-black/70">
          <input
            type="checkbox"
            checked={showRevokedAccessHistory}
            onChange={(e) => setShowRevokedAccessHistory(e.target.checked)}
            className="rounded border-black/20"
          />
          Show revoked access history
        </label>
      </div>

      {editOpen && editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-black/50">Edit gallery</p>
                <p className="mt-1 text-lg text-black/80">{editing.title}</p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={closeEditModal} disabled={editSaving}>
                Close
              </button>
            </div>

            {editError ? (
              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
                {editError}
              </p>
            ) : null}

            <form onSubmit={saveEdit} className="mt-6 grid gap-4">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-black/50">Title</span>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  required
                  disabled={editSaving}
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-black/50">Slug</span>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  value={editForm.slug}
                  onChange={(e) => setEditForm((p) => ({ ...p, slug: e.target.value }))}
                  required
                  disabled={editSaving}
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-black/50">Description</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  disabled={editSaving}
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.2em] text-black/50">Cover image URL</span>
                <input
                  className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                  value={editForm.coverUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, coverUrl: e.target.value }))}
                  disabled={editSaving}
                />
                <button
                  type="button"
                  className="mt-2 text-xs uppercase tracking-[0.2em] text-black/45 underline"
                  onClick={() => setR2CoverTarget("editCover")}
                  disabled={editSaving}
                >
                  Choose from R2
                </button>
              </label>
              {editForm.galleryType === "FINAL_DELIVERY" ? (
                <>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.2em] text-black/50">
                      Backup Google Drive link
                    </span>
                    <input
                      className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                      value={editForm.deliveryDriveLink}
                      onChange={(e) => setEditForm((p) => ({ ...p, deliveryDriveLink: e.target.value }))}
                      disabled={editSaving}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs uppercase tracking-[0.2em] text-black/50">
                      Usage guide override
                    </span>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                      value={editForm.usageGuideText}
                      onChange={(e) => setEditForm((p) => ({ ...p, usageGuideText: e.target.value }))}
                      rows={3}
                      disabled={editSaving}
                    />
                  </label>
                </>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2em] text-black/50">Status</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    disabled={editSaving}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2em] text-black/50">Gallery type</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                    value={editForm.galleryType}
                    onChange={(e) => setEditForm((p) => ({ ...p, galleryType: e.target.value }))}
                    disabled={editSaving}
                  >
                    {TYPE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2em] text-black/50">Client</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                    value={editForm.clientId}
                    onChange={(e) => setEditForm((p) => ({ ...p, clientId: e.target.value }))}
                    disabled={editSaving}
                  >
                    <option value="">No client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.2em] text-black/50">Project</span>
                  <select
                    className="mt-1 w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
                    value={editForm.projectId}
                    onChange={(e) => setEditForm((p) => ({ ...p, projectId: e.target.value }))}
                    disabled={editSaving}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-black/70">
                <input
                  type="checkbox"
                  checked={editForm.published}
                  onChange={(e) => setEditForm((p) => ({ ...p, published: e.target.checked }))}
                  disabled={editSaving}
                />
                Published (legacy flag)
              </label>

              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn btn-primary" type="submit" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save changes"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={closeEditModal} disabled={editSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
        <label className="block">
          <input
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            placeholder="Cover image URL"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
          />
          <button
            type="button"
            className="mt-2 text-xs uppercase tracking-[0.2em] text-black/45 underline"
            onClick={() => setR2CoverTarget("createCover")}
          >
            Choose from R2
          </button>
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            value={galleryStatus}
            onChange={(e) => setGalleryStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
            value={galleryType}
            onChange={(e) => setGalleryType(e.target.value)}
          >
            {TYPE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        {galleryType === "FINAL_DELIVERY" ? (
          <>
            <input
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
              placeholder="Backup Google Drive link (optional)"
              value={deliveryDriveLink}
              onChange={(e) => setDeliveryDriveLink(e.target.value)}
            />
            <textarea
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
              placeholder="Usage guide override (optional)"
              value={usageGuideText}
              onChange={(e) => setUsageGuideText(e.target.value)}
              rows={3}
            />
          </>
        ) : null}
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
        {visibleItems.map((item) => (
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
                {(item.status || item.galleryType) && (
                  <p className="mt-1 text-xs text-black/40">
                    {item.status?.replace(/_/g, " ") ?? ""}
                    {item.status && item.galleryType ? " · " : ""}
                    {item.galleryType?.replace(/_/g, " ") ?? ""}
                  </p>
                )}
                {item.deliveredAt ? (
                  <p className="mt-1 text-xs text-black/40">
                    Delivered {new Date(item.deliveredAt).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/admin/galleries/${item.id}`} className="btn btn-ghost">
                  Manage
                </Link>
                <button className="btn btn-ghost" type="button" onClick={() => openEditModal(item)}>
                  Edit
                </button>
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
                {item.galleryType === "FINAL_DELIVERY" ? (
                  <button
                    className="btn btn-ghost"
                    onClick={() => markDelivered(item)}
                  >
                    Mark delivered
                  </button>
                ) : null}
                <button
                  className="btn btn-ghost"
                  onClick={() => deleteGallery(item.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {item.images?.length ? (
              <div className="mt-2 text-xs text-black/50">
                {(() => {
                  const metas = item.images
                    .map((img) => (img.meta as ImageMeta) ?? null)
                    .filter(Boolean);
                  const usageCounts = metas.reduce((acc, m) => {
                    const u = (m as ImageMeta)?.usageType || "—";
                    acc[u] = (acc[u] ?? 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  const now = Date.now();
                  const soon = now + 90 * 24 * 60 * 60 * 1000;
                  const expiringSoon = metas.filter((m) => {
                    const exp = (m as ImageMeta)?.licenseExpiration;
                    if (!exp) return false;
                    const d = new Date(exp);
                    return !isNaN(d.getTime()) && d.getTime() >= now && d.getTime() < soon;
                  });
                  const expired = metas.filter((m) => {
                    const exp = (m as ImageMeta)?.licenseExpiration;
                    if (!exp) return false;
                    const d = new Date(exp);
                    return !isNaN(d.getTime()) && d.getTime() < now;
                  });
                  const parts: string[] = [];
                  if (Object.keys(usageCounts).length > 0) {
                    parts.push(
                      Object.entries(usageCounts)
                        .map(([k, v]) => (k === "—" ? `${v} unspecified` : `${v} ${k}`))
                        .join(", ")
                    );
                  }
                  if (expiringSoon.length > 0) parts.push(`${expiringSoon.length} expiring soon`);
                  if (expired.length > 0) parts.push(`${expired.length} expired`);
                  return parts.length > 0 ? (
                    <span>
                      Licensing: {parts.join(" · ")}
                    </span>
                  ) : null;
                })()}
              </div>
            ) : null}
            {(() => {
              const allTokens = item.accessTokens ?? [];
              const rowTokens = showRevokedAccessHistory
                ? allTokens
                : allTokens.filter((t) => t.isActive !== false);
              if (!rowTokens.length) return null;
              return (
              <div className="mt-3 space-y-2 text-xs text-black/50">
                {rowTokens.map((token) => (
                  <div key={token.id} className="flex flex-wrap items-center gap-3">
                    <span>
                      {token.isActive === false ? (
                        <>
                          Inactive code{" "}
                          <span className="font-mono text-black/40">•••••</span>
                        </>
                      ) : (
                        <>
                          Access code{" "}
                          <span className="font-mono text-black/80">{token.codeHint || "—"}</span>
                        </>
                      )}
                    </span>
                    {token.expiresAt ? (
                      <span>Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>
                    ) : null}
                    {token.isActive === false ? (
                      <span className="text-red-500">Revoked</span>
                    ) : null}
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={token.isActive === false}
                      onClick={() => revokeToken(item.id, token.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
              );
            })()}
            {lastGeneratedToken && lastGeneratedTokenGalleryId === item.id ? (
              <div className="mt-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs">
                New access code: <span className="font-semibold">{lastGeneratedToken}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <R2BrowserModal
        isOpen={Boolean(r2CoverTarget)}
        onClose={() => setR2CoverTarget(null)}
        mode="single"
        mediaRoot="portfolio"
        initialPortfolioFolder="all"
        initialCustomPrefix="client-galleries/"
        confirmLabel="Use as cover"
        onAddKeys={handleR2CoverKeys}
      />
    </div>
  );
}
