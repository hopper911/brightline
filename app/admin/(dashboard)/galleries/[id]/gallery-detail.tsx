"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type GalleryImage = {
  id: string;
  sortOrder: number;
  isHero: boolean;
  alt: string | null;
  thumbUrl: string | null;
  fullUrl: string | null;
  url: string;
  filename: string | null;
  storageKey: string | null;
};

type Token = {
  id: string;
  codeHint: string;
  label: string | null;
  expiresAt: string | null;
  allowDownload: boolean;
  maxDownloads: number | null;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
  selectedCount?: number;
  selectionsSubmittedAt?: string | null;
};

type StudioProjectOpt = { id: string; title: string; slug: string };

type GalleryPayload = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  clientNotes: string | null;
  internalNotes?: string | null;
  published: boolean;
  status: string;
  galleryType: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientId: string | null;
  projectId: string | null;
  studioProjectId: string | null;
  studioProject?: StudioProjectOpt | null;
  client?: { id: string; name: string } | null;
  project?: { id: string; title: string } | null;
  images: GalleryImage[];
  accessTokens: Token[];
};

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

export default function GalleryDetail({ initialGallery }: { initialGallery: GalleryPayload }) {
  const [gallery, setGallery] = useState(initialGallery);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [studioProjects, setStudioProjects] = useState<StudioProjectOpt[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const heroId = useMemo(
    () => gallery.images.find((i) => i.isHero)?.id ?? null,
    [gallery.images]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      const [sp, cl, pj] = await Promise.all([
        fetch("/api/admin/studio-projects", { credentials: "include" }),
        fetch("/api/admin/client-list", { credentials: "include" }),
        fetch("/api/admin/projects", { credentials: "include" }),
      ]);
      if (!active) return;
      if (sp.ok) {
        const j = (await sp.json()) as { projects?: StudioProjectOpt[] };
        setStudioProjects(j.projects ?? []);
      }
      if (cl.ok) {
        const j = (await cl.json()) as { clients?: { id: string; name: string }[] };
        setClients(j.clients ?? []);
      }
      if (pj.ok) {
        const j = (await pj.json()) as { projects?: { id: string; title: string }[] };
        setProjects(j.projects ?? []);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
      credentials: "include",
    });
    const data = (await res.json()) as { ok?: boolean; gallery?: GalleryPayload; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to refresh");
    if (data.gallery) setGallery(data.gallery);
  }, [gallery.id]);

  const patchGallery = useCallback(
    async (payload: Record<string, unknown>) => {
      setError(null);
      const res = await fetch(`/api/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; gallery?: GalleryPayload; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (data.gallery) setGallery(data.gallery);
    },
    [gallery.id]
  );

  async function saveMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title")?.toString().trim(),
      slug: fd.get("slug")?.toString().trim(),
      description: fd.get("description")?.toString().trim() || null,
      coverUrl: fd.get("coverUrl")?.toString().trim() || null,
      clientNotes: fd.get("clientNotes")?.toString().trim() || null,
      internalNotes: fd.get("internalNotes")?.toString().trim() || null,
      published: fd.get("published") === "on",
      status: fd.get("status")?.toString(),
      galleryType: fd.get("galleryType")?.toString(),
      sentAt: fd.get("sentAt")?.toString().trim() || null,
      clientId: fd.get("clientId")?.toString() || null,
      projectId: fd.get("projectId")?.toString() || null,
      studioProjectId: fd.get("studioProjectId")?.toString() || null,
    };
    try {
      await patchGallery({
        ...payload,
        clientId: payload.clientId || null,
        projectId: payload.projectId || null,
        studioProjectId: payload.studioProjectId || null,
        sentAt: payload.sentAt ? new Date(payload.sentAt).toISOString() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function move(imageId: string, dir: -1 | 1) {
    setError(null);
    const idx = gallery.images.findIndex((i) => i.id === imageId);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= gallery.images.length) return;
    const next = [...gallery.images];
    const tmp = next[idx];
    next[idx] = next[swapIdx];
    next[swapIdx] = tmp;
    setGallery((g) => ({ ...g, images: next }));
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((i) => i.id) }),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; images?: GalleryImage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reorder failed");
      if (data.images) setGallery((g) => ({ ...g, images: data.images! }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
      await refresh().catch(() => {});
    }
  }

  async function setHero(imageId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageId: imageId }),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; images?: GalleryImage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to set hero");
      if (data.images) setGallery((g) => ({ ...g, images: data.images! }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set hero");
    }
  }

  async function generateToken(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setTokenBusy(true);
    setLastToken(null);
    const fd = new FormData(e.currentTarget);
    const expiresAt = fd.get("expiresAt")?.toString().trim() || "";
    const payload = {
      label: fd.get("label")?.toString().trim() || null,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      allowDownload: fd.get("allowDownload") === "on",
      maxDownloads: fd.get("maxDownloads")
        ? Number(fd.get("maxDownloads"))
        : null,
    };
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Token generation failed");
      if (data.token) setLastToken(data.token);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Token generation failed");
    } finally {
      setTokenBusy(false);
    }
  }

  async function revokeToken(tokenId: string) {
    if (!confirm("Revoke this access token?")) return;
    setError(null);
    setTokenBusy(true);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/token`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId }),
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Revoke failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setTokenBusy(false);
    }
  }

  async function copyClientPortalLink() {
    const url = `${window.location.origin}/client`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg("Copied client access URL");
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Could not copy — copy manually: " + url);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Link
        href="/admin/galleries"
        className="text-xs uppercase tracking-[0.25em] text-white/50 hover:text-white/80"
      >
        ← Galleries
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">
            Studio OS
          </p>
          <h1 className="mt-2 font-display text-4xl text-white">{gallery.title}</h1>
          <p className="mt-1 text-xs text-white/40">
            /{gallery.slug} · {gallery.status.replace(/_/g, " ")} ·{" "}
            {gallery.galleryType.replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => void copyClientPortalLink()}>
            Copy client portal link
          </button>
          <a
            href={`/client`}
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            Open client access
          </a>
        </div>
      </div>

      {copyMsg ? (
        <p className="mt-3 text-xs text-emerald-200/90">{copyMsg}</p>
      ) : null}

      <p className="mt-2 max-w-2xl text-xs text-white/45">
        Clients sign in at /client with their code. Share the code separately or via email (TODO:
        automated send).
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <form
          key={`${gallery.updatedAt}-${gallery.status}`}
          onSubmit={saveMeta}
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">
            Gallery details
          </p>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Title
            </span>
            <input
              name="title"
              defaultValue={gallery.title}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Slug
            </span>
            <input
              name="slug"
              defaultValue={gallery.slug}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Description
            </span>
            <textarea
              name="description"
              defaultValue={gallery.description ?? ""}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Cover URL
            </span>
            <input
              name="coverUrl"
              defaultValue={gallery.coverUrl ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Client notes (visible to client)
            </span>
            <textarea
              name="clientNotes"
              defaultValue={gallery.clientNotes ?? ""}
              rows={4}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Internal notes (admin only)
            </span>
            <textarea
              name="internalNotes"
              defaultValue={gallery.internalNotes ?? ""}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                Status
              </span>
              <select
                name="status"
                defaultValue={gallery.status}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                Gallery type
              </span>
              <select
                name="galleryType"
                defaultValue={gallery.galleryType}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
              >
                {TYPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Sent at (optional)
            </span>
            <input
              name="sentAt"
              type="datetime-local"
              defaultValue={
                gallery.sentAt
                  ? gallery.sentAt.slice(0, 16)
                  : ""
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                Portal client
              </span>
              <select
                name="clientId"
                defaultValue={gallery.clientId ?? ""}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
              >
                <option value="">None</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                Portal project
              </span>
              <select
                name="projectId"
                defaultValue={gallery.projectId ?? ""}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">
              Studio CMS project (optional link)
            </span>
            <select
              name="studioProjectId"
              defaultValue={gallery.studioProjectId ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            >
              <option value="">None</option>
              {studioProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <input
              name="published"
              type="checkbox"
              defaultChecked={gallery.published}
              className="rounded border-white/20"
            />
            Published (legacy flag)
          </label>

          <button className="btn btn-primary mt-4" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Delivery & proofing
            </p>
            <p className="mt-2 text-sm text-white/60">
              Images in gallery: {gallery.images.length}. Selection counts are per access token
              below.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  void patchGallery({
                    status: "READY_TO_SEND",
                  }).catch((e) => setError(String(e)))
                }
              >
                Mark ready to send
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  void patchGallery({
                    status: "SENT",
                    sentAt: new Date().toISOString(),
                  }).catch((e) => setError(String(e)))
                }
              >
                Mark sent
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  void patchGallery({ status: "FINALIZED" }).catch((e) =>
                    setError(String(e))
                  )
                }
              >
                Mark finalized
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  void patchGallery({ status: "DELIVERED" }).catch((e) =>
                    setError(String(e))
                  )
                }
              >
                Mark delivered
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Access tokens
            </p>

            {lastToken ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  New token (copy now)
                </p>
                <p className="mt-1 font-mono text-white">{lastToken}</p>
              </div>
            ) : null}

            <form onSubmit={generateToken} className="mt-4 grid gap-3">
              <input
                name="label"
                placeholder="Label (optional)"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="expiresAt"
                  type="date"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
                />
                <input
                  name="maxDownloads"
                  type="number"
                  min={0}
                  placeholder="Max downloads (optional)"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  name="allowDownload"
                  type="checkbox"
                  className="rounded border-white/20"
                />
                Allow download
              </label>
              <button className="btn btn-ghost" type="submit" disabled={tokenBusy}>
                {tokenBusy ? "Working…" : "Generate token"}
              </button>
            </form>

            <div className="mt-6 space-y-2">
              {gallery.accessTokens.length === 0 ? (
                <p className="text-sm text-white/60">No tokens yet.</p>
              ) : (
                gallery.accessTokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                  >
                    <div className="min-w-[220px]">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                        {t.label || "Token"} · {t.isActive ? "active" : "revoked"}
                      </p>
                      <p className="font-mono">{t.codeHint}</p>
                      <p className="text-xs text-white/50">
                        {t.expiresAt
                          ? `Expires ${new Date(t.expiresAt).toLocaleDateString()}`
                          : "No expiry"}
                        {t.allowDownload ? " · downloads on" : ""}
                      </p>
                      <p className="text-xs text-amber-200/90">
                        Selections: {t.selectedCount ?? 0}
                        {t.selectionsSubmittedAt
                          ? ` · submitted ${new Date(t.selectionsSubmittedAt).toLocaleString()}`
                          : " · not submitted"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost text-sm"
                      disabled={tokenBusy || !t.isActive}
                      onClick={() => void revokeToken(t.id)}
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
            Images ({gallery.images.length})
          </h2>
          <p className="text-xs text-white/40">
            Hero: {heroId ? heroId.slice(0, 8) : "—"}
          </p>
        </div>

        {gallery.images.length === 0 ? (
          <p className="mt-3 text-sm text-white/60">No images yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {gallery.images.map((img, idx) => (
              <li
                key={img.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex min-w-[260px] items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-lg bg-black/40">
                    <img
                      src={(img.thumbUrl || img.fullUrl || img.url) as string}
                      alt={img.alt ?? ""}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-white/80">
                      {img.filename || img.storageKey?.split("/").pop() || img.id.slice(0, 8)}
                      {img.isHero ? " · hero" : ""}
                    </p>
                    <p className="text-xs text-white/40">sort {idx}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() => void move(img.id, -1)}
                    disabled={idx === 0}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() => void move(img.id, 1)}
                    disabled={idx === gallery.images.length - 1}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm"
                    onClick={() => void setHero(img.id)}
                    disabled={img.isHero}
                  >
                    Set hero
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
