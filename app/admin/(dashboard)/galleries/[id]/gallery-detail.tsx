"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { GalleryStatus, GalleryType } from "@prisma/client";
import { DeliveryEmailTemplate } from "@/components/delivery/DeliveryEmailTemplate";
import R2BrowserModal from "@/components/admin/R2BrowserModal";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";

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
  lowResStorageKey?: string | null;
  lowResWidth?: number | null;
  lowResHeight?: number | null;
  lowResBytes?: number | null;
  highResWidth?: number | null;
  highResHeight?: number | null;
  highResBytes?: number | null;
};

type GalleryVideoRow = {
  id: string;
  title: string | null;
  filename: string | null;
  storageKey: string;
  posterKey?: string | null;
  sortOrder: number;
  allowDownload: boolean;
  url: string | null;
  posterUrl?: string | null;
  createdAt: string;
  updatedAt: string;
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
  deliveryDriveLink: string | null;
  usageGuideText: string | null;
  deliveredAt: string | null;
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
  videos: GalleryVideoRow[];
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

type GalleryTab =
  | "overview"
  | "uploads"
  | "videos"
  | "access"
  | "delivery"
  | "activity";

export default function GalleryDetail({ initialGallery }: { initialGallery: GalleryPayload }) {
  const [gallery, setGallery] = useState<GalleryPayload>({
    ...initialGallery,
    videos: initialGallery.videos ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [studioProjects, setStudioProjects] = useState<StudioProjectOpt[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<GalleryTab>("overview");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [finalizeBusyId, setFinalizeBusyId] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<
    {
      id: string;
      action: string | null;
      imageId: string | null;
      ip: string | null;
      createdAt: string;
      codeHint: string | null;
    }[]
  >([]);
  const [activityDownloads, setActivityDownloads] = useState<
    { id: string; type: string | null; imageId: string | null; codeHint: string | null }[]
  >([]);
  const [r2Open, setR2Open] = useState(false);
  const [r2Busy, setR2Busy] = useState(false);
  const [showRevokedAccess, setShowRevokedAccess] = useState(false);

  const clientPortalBlocked = !isGalleryViewableByClient({
    status: gallery.status as GalleryStatus,
    galleryType: gallery.galleryType as GalleryType,
  });

  const visibleAccessTokens = useMemo(() => {
    const list = gallery.accessTokens ?? [];
    if (showRevokedAccess) return list;
    return list.filter((t) => t.isActive);
  }, [gallery.accessTokens, showRevokedAccess]);

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

  useEffect(() => {
    if (tab !== "activity") return;
    let active = true;
    setActivityLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/admin/galleries/${gallery.id}/activity`, {
          credentials: "include",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          logs?: typeof activityLogs;
          downloads?: typeof activityDownloads;
        };
        if (!active) return;
        if (data.ok) {
          setActivityLogs(data.logs ?? []);
          setActivityDownloads(data.downloads ?? []);
        }
      } catch {
        if (active) setError("Could not load activity.");
      } finally {
        if (active) setActivityLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [gallery.id, tab]);

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

  const attachR2Keys = useCallback(
    async (keys: string[]) => {
      setR2Busy(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/galleries/${gallery.id}/images/from-keys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ keys }),
        });
        const data = (await res.json()) as { ok?: boolean; gallery?: GalleryPayload; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Could not attach files from R2.");
        if (data.gallery) {
          setGallery({
            ...data.gallery,
            videos: data.gallery.videos ?? [],
          });
        } else {
          await refresh();
        }
        setR2Open(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "R2 attach failed");
      } finally {
        setR2Busy(false);
      }
    },
    [gallery.id, refresh]
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
      deliveryDriveLink: fd.get("deliveryDriveLink")?.toString().trim() || null,
      usageGuideText: fd.get("usageGuideText")?.toString().trim() || null,
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
      await refresh();
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
      await refresh();
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
      allowDownload:
        gallery.galleryType === "FINAL_DELIVERY" || fd.get("allowDownload") === "on",
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
      const data = (await res.json()) as {
        ok?: boolean;
        token?: string;
        gallery?: GalleryPayload;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Token generation failed");
      if (data.token) setLastToken(data.token);
      if (data.gallery) {
        setGallery({
          ...data.gallery,
          videos: data.gallery.videos ?? [],
        });
      } else {
        await refresh();
      }
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

  async function markDelivered() {
    const deliveredAt = new Date().toISOString();
    await patchGallery({
      status: "DELIVERED",
      deliveredAt: gallery.deliveredAt || deliveredAt,
      sentAt: gallery.sentAt || deliveredAt,
    });
  }

  async function uploadGalleryImages(files: FileList | null) {
    if (!files?.length) return;
    setUploadBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const up = await fetch(`/api/admin/galleries/${gallery.id}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "image/jpeg",
          }),
        });
        const payload = (await up.json()) as {
          ok?: boolean;
          image?: { id: string };
          upload?: { url: string; headers?: Record<string, string> };
          error?: string;
        };
        if (!up.ok || !payload.ok || !payload.upload?.url || !payload.image?.id) {
          throw new Error(payload.error ?? "Upload URL failed");
        }
        const put = await fetch(payload.upload.url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "image/jpeg",
            ...(payload.upload.headers ?? {}),
          },
        });
        if (!put.ok) throw new Error("Upload to storage failed");

        const fin = await fetch(`/api/admin/galleries/${gallery.id}/images/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageId: payload.image.id }),
        });
        const finData = (await fin.json()) as { ok?: boolean; error?: string; gallery?: GalleryPayload };
        if (!fin.ok || !finData.ok) {
          throw new Error(finData.error ?? "Finalize / low-res generation failed");
        }
        if (finData.gallery) setGallery(finData.gallery);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  async function finalizeImage(imageId: string) {
    setFinalizeBusyId(imageId);
    setError(null);
    try {
      const fin = await fetch(`/api/admin/galleries/${gallery.id}/images/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageId }),
      });
      const finData = (await fin.json()) as { ok?: boolean; error?: string; gallery?: GalleryPayload };
      if (!fin.ok || !finData.ok) throw new Error(finData.error ?? "Finalize failed");
      if (finData.gallery) setGallery(finData.gallery);
      else await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finalize failed");
    } finally {
      setFinalizeBusyId(null);
    }
  }

  async function uploadGalleryVideo(file: File) {
    setVideoBusy(true);
    setError(null);
    try {
      const up = await fetch(`/api/admin/galleries/${gallery.id}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "video/mp4",
        }),
      });
      const payload = (await up.json()) as {
        ok?: boolean;
        video?: { id: string };
        upload?: { url: string; headers?: Record<string, string> };
        error?: string;
      };
      if (!up.ok || !payload.ok || !payload.upload?.url) {
        throw new Error(payload.error ?? "Video upload URL failed");
      }
      const put = await fetch(payload.upload.url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "video/mp4",
          ...(payload.upload.headers ?? {}),
        },
      });
      if (!put.ok) throw new Error("Video upload failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setVideoBusy(false);
    }
  }

  async function patchVideo(videoId: string, body: { title?: string | null; allowDownload?: boolean }) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/galleries/${gallery.id}/videos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ videoId, ...body }),
      });
      const data = (await res.json()) as { ok?: boolean; gallery?: GalleryPayload; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Update failed");
      if (data.gallery) setGallery(data.gallery);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function uploadVideoPoster(videoId: string, file: File) {
    setVideoBusy(true);
    setError(null);
    try {
      const up = await fetch(
        `/api/admin/galleries/${gallery.id}/videos/${videoId}/poster-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "image/jpeg",
          }),
        }
      );
      const payload = (await up.json()) as {
        ok?: boolean;
        posterKey?: string;
        upload?: { url: string; headers?: Record<string, string> };
        error?: string;
      };
      if (!up.ok || !payload.ok || !payload.upload?.url || !payload.posterKey) {
        throw new Error(payload.error ?? "Poster URL failed");
      }
      const put = await fetch(payload.upload.url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "image/jpeg",
          ...(payload.upload.headers ?? {}),
        },
      });
      if (!put.ok) throw new Error("Poster upload failed");
      const fin = await fetch(
        `/api/admin/galleries/${gallery.id}/videos/${videoId}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ posterKey: payload.posterKey }),
        }
      );
      const finData = (await fin.json()) as { ok?: boolean; gallery?: GalleryPayload; error?: string };
      if (!fin.ok || !finData.ok) throw new Error(finData.error ?? "Poster finalize failed");
      if (finData.gallery) setGallery(finData.gallery);
      else await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poster failed");
    } finally {
      setVideoBusy(false);
    }
  }

  const tabLinks: { id: GalleryTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "uploads", label: "Uploads" },
    { id: "videos", label: "Videos" },
    { id: "access", label: "Access codes" },
    { id: "delivery", label: "Delivery" },
    { id: "activity", label: "Activity" },
  ];

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
        Clients use a <strong className="text-white/80">5-digit numeric code</strong> at /client (spaces
        okay). Issuing a new code deactivates the previous one for this gallery. Generating a token also
        moves Draft / Ready to send → Sent so clients can open the gallery.
      </p>

      {clientPortalBlocked ? (
        <div className="mt-4 max-w-2xl rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
          Client portal is blocked for status{" "}
          <strong>{gallery.status.replace(/_/g, " ")}</strong> (expired/archived/internal review, or not
          yet sent). Clients with a code will see an error until you move the gallery into a sent/review
          state.
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <nav className="mt-10 flex flex-wrap gap-2 border-b border-white/10 pb-4" aria-label="Gallery sections">
        {tabLinks.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              tab === t.id
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/15"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mt-8 space-y-10">
        {tab === "overview" ? (
        <div className="max-w-3xl">
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
          {gallery.galleryType === "FINAL_DELIVERY" ? (
            <>
              <label className="mt-4 block">
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Backup Google Drive link
                </span>
                <input
                  name="deliveryDriveLink"
                  defaultValue={gallery.deliveryDriveLink ?? ""}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Usage guide override
                </span>
                <textarea
                  name="usageGuideText"
                  defaultValue={gallery.usageGuideText ?? ""}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
                />
              </label>
            </>
          ) : null}
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
        </div>
        ) : tab === "delivery" ? (
        <div className="max-w-3xl space-y-6">
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
                onClick={() => void markDelivered().catch((e) => setError(String(e)))}
              >
                Mark delivered
              </button>
            </div>
            {gallery.deliveredAt ? (
              <p className="mt-3 text-xs text-white/45">
                Delivered {new Date(gallery.deliveredAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>

          {gallery.galleryType === "FINAL_DELIVERY" ? (
            <DeliveryEmailTemplate
              clientName={gallery.client?.name}
              projectName={gallery.project?.title || gallery.title}
              deliveryLink="/client"
            />
          ) : null}
        </div>
        ) : tab === "access" ? (
        <div className="max-w-3xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">
              Access tokens
            </p>
            <p className="mt-2 text-xs text-white/45">
              One active code per gallery. Older codes appear as revoked if you generate again.
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={showRevokedAccess}
                onChange={(e) => setShowRevokedAccess(e.target.checked)}
                className="rounded border-white/20"
              />
              Show revoked history
            </label>

            {lastToken ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  New code (copy for client — full 5 digits)
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
                  defaultChecked={gallery.galleryType === "FINAL_DELIVERY"}
                  className="rounded border-white/20"
                />
                Allow download
              </label>
              <button className="btn btn-ghost" type="submit" disabled={tokenBusy}>
                {tokenBusy ? "Working…" : "Generate token"}
              </button>
            </form>

            <div className="mt-6 space-y-2">
              {visibleAccessTokens.length === 0 ? (
                <p className="text-sm text-white/60">
                  {showRevokedAccess
                    ? "No tokens yet."
                    : "No active codes. Generate one above or show revoked history."}
                </p>
              ) : (
                visibleAccessTokens.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80"
                  >
                    <div className="min-w-[220px]">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                        {t.label || "Code"} · {t.isActive ? "active" : "revoked"}
                      </p>
                      <p className="font-mono">
                        {t.isActive ? t.codeHint : "••••• (inactive)"}
                      </p>
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
        ) : tab === "uploads" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Uploads · originals</p>
            <p className="mt-2 text-sm text-white/55">
              Add high-resolution stills. Each upload is pushed to private storage, then finalized to
              build a web-ready JPEG for previews and client “low-res” downloads.
            </p>
            <label className="mt-4 block text-sm text-white/70">
              <span className="sr-only">Upload images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadBusy}
                className="block w-full text-sm text-white/80 file:mr-4 file:rounded-xl file:border file:border-white/20 file:bg-white/10 file:px-4 file:py-2 file:text-white"
                onChange={(e) => void uploadGalleryImages(e.target.files)}
              />
            </label>
            {uploadBusy ? (
              <p className="mt-2 text-xs text-amber-200/90">Uploading and generating derivatives…</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                disabled={r2Busy}
                onClick={() => setR2Open(true)}
              >
                Browse R2
              </button>
              {r2Busy ? <span className="text-xs text-white/50">Attaching from R2…</span> : null}
            </div>
          </div>

          <section>
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
                        <p className="text-xs text-white/40">
                          sort {idx}
                          {img.lowResStorageKey
                            ? ` · web-ready ${img.lowResWidth ?? "?"}×${img.lowResHeight ?? "?"}`
                            : " · web-ready pending"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!img.lowResStorageKey ? (
                        <button
                          type="button"
                          className="btn btn-primary text-sm"
                          disabled={finalizeBusyId === img.id || !img.storageKey}
                          onClick={() => void finalizeImage(img.id)}
                        >
                          {finalizeBusyId === img.id ? "Finalizing…" : "Finalize / low-res"}
                        </button>
                      ) : (
                        <span className="self-center text-xs text-emerald-200/90">Low-res ready</span>
                      )}
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
        ) : tab === "videos" ? (
        <div className="max-w-3xl space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Project video</p>
            <p className="mt-2 text-sm text-white/55">
              Upload a review or delivery reel. Clients stream from a signed URL after they unlock the
              gallery.
            </p>
            <label className="mt-4 block text-sm text-white/70">
              <span className="sr-only">Upload video</span>
              <input
                type="file"
                accept="video/*"
                disabled={videoBusy}
                className="block w-full text-sm text-white/80 file:mr-4 file:rounded-xl file:border file:border-white/20 file:bg-white/10 file:px-4 file:py-2 file:text-white"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadGalleryVideo(f);
                  e.target.value = "";
                }}
              />
            </label>
            {videoBusy ? (
              <p className="mt-2 text-xs text-amber-200/90">Working on video…</p>
            ) : null}
          </div>

          {gallery.videos.length === 0 ? (
            <p className="text-sm text-white/60">No videos yet.</p>
          ) : (
            <ul className="space-y-4">
              {gallery.videos.map((v) => (
                <li
                  key={v.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
                >
                  {v.url ? (
                    <video
                      src={v.url}
                      poster={v.posterUrl ?? undefined}
                      controls
                      className="w-full max-h-56 rounded-xl bg-black"
                    />
                  ) : (
                    <p className="text-sm text-white/50">Preview unavailable</p>
                  )}
                  <div className="flex flex-wrap gap-3 items-end">
                    <label className="block flex-1 min-w-[200px]">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/50">Title</span>
                      <input
                        defaultValue={v.title ?? ""}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        onBlur={(e) => {
                          const title = e.target.value.trim() || null;
                          if (title !== (v.title ?? null)) void patchVideo(v.id, { title });
                        }}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        defaultChecked={v.allowDownload}
                        onChange={(e) => void patchVideo(v.id, { allowDownload: e.target.checked })}
                        className="rounded border-white/20"
                      />
                      Allow download
                    </label>
                  </div>
                  <label className="block text-xs text-white/50">
                    Poster image (optional)
                    <input
                      type="file"
                      accept="image/*"
                      disabled={videoBusy}
                      className="mt-1 block w-full text-sm text-white/80 file:mr-4 file:rounded-xl file:border file:border-white/20 file:bg-white/10 file:px-3 file:py-1.5 file:text-white"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadVideoPoster(v.id, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        ) : tab === "activity" ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {activityLoading ? (
            <p className="text-sm text-white/50 col-span-full">Loading activity…</p>
          ) : (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Views & actions</p>
                <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto text-sm">
                  {activityLogs.length === 0 ? (
                    <li className="text-white/50">No entries.</li>
                  ) : (
                    activityLogs.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80"
                      >
                        <p className="font-mono text-[10px] text-white/45">
                          {new Date(l.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-0.5">
                          <span className="text-emerald-200/90">{l.action || "—"}</span>
                          {l.codeHint ? (
                            <span className="text-white/45"> · {l.codeHint}</span>
                          ) : null}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Downloads</p>
                <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto text-sm">
                  {activityDownloads.length === 0 ? (
                    <li className="text-white/50">No downloads logged.</li>
                  ) : (
                    activityDownloads.map((d) => (
                      <li
                        key={d.id}
                        className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80"
                      >
                        <p className="text-amber-200/90">{d.type || "download"}</p>
                        {d.codeHint ? (
                          <p className="text-xs text-white/45">Token {d.codeHint}</p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
        ) : null}
      </div>

      <R2BrowserModal
        isOpen={r2Open}
        onClose={() => setR2Open(false)}
        onAddKeys={attachR2Keys}
        initialCustomPrefix={`client-galleries/${gallery.id}/`}
      />
    </div>
  );
}
