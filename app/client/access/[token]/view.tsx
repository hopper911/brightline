"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getImageModeForUrl } from "@/lib/image-utils";
import { DeliveryUsageGuide } from "@/components/delivery/DeliveryUsageGuide";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type GalleryImage = {
  id: string;
  url: string;
  thumbUrl?: string;
  fullUrl?: string;
  alt?: string | null;
  filename?: string | null;
  sortOrder: number;
  isHero?: boolean;
  storageKey?: string | null;
  lowResStorageKey?: string | null;
  highResWidth?: number | null;
  highResHeight?: number | null;
  lowResWidth?: number | null;
  lowResHeight?: number | null;
  isFavorite: boolean;
  isSelected: boolean;
  meta?: { caption?: string } | Record<string, unknown> | null;
};

type GalleryVideoRow = {
  id: string;
  title?: string | null;
  filename?: string | null;
  url: string;
  posterUrl?: string | null;
  allowDownload: boolean;
  sortOrder: number;
};

type GalleryPayload = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  clientNotes?: string | null;
  galleryType?: string;
  deliveryDriveLink?: string | null;
  usageGuideText?: string | null;
  deliveredAt?: string | null;
  coverUrl?: string | null;
  clientName?: string | null;
  projectTitle?: string | null;
  images: GalleryImage[];
  videos: GalleryVideoRow[];
  allowDownload: boolean;
  expiresAt?: string | null;
  selectionWorkflow?: boolean;
  showSelectionTools?: boolean;
  selectionsLocked?: boolean;
  selectionsSubmittedAt?: string | null;
  selectedCount?: number;
};

type ViewMode = "all" | "favorites" | "selected";
type DeliveryGroup = "full-res" | "web-ready" | "social" | "heroes";

function metaString(meta: GalleryImage["meta"], key: string) {
  if (!meta || typeof meta !== "object" || !(key in meta)) return "";
  const value = (meta as Record<string, unknown>)[key];
  return typeof value === "string" ? value.toLowerCase() : "";
}

function imageMatchesDeliveryGroup(image: GalleryImage, group: DeliveryGroup) {
  if (group === "heroes") return Boolean(image.isHero);

  const usageType = metaString(image.meta, "usageType");
  const deliveryFolder = metaString(image.meta, "deliveryFolder");
  const combined = `${usageType} ${deliveryFolder}`;

  if (group === "social") return combined.includes("social");
  if (group === "web-ready") {
    return combined.includes("web") || combined.includes("online");
  }
  return (
    combined.includes("full") ||
    combined.includes("print") ||
    combined.includes("archive")
  );
}

function countDeliveryGroup(images: GalleryImage[], group: DeliveryGroup) {
  const explicitCount = images.filter((img) =>
    imageMatchesDeliveryGroup(img, group)
  ).length;
  if (explicitCount > 0 || group === "social" || group === "heroes") {
    return explicitCount;
  }
  return images.length;
}

export default function ClientGalleryView({ token }: { token: string }) {
  const [gallery, setGallery] = useState<GalleryPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadQuality, setDownloadQuality] = useState<"low" | "high">("high");
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/client/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        setHttpStatus(res.status);
        const data = (await res.json()) as {
          ok: boolean;
          gallery?: GalleryPayload;
          error?: string;
        };

        if (!res.ok || !data.ok || !data.gallery) {
          throw new Error(data.error || "Unable to load gallery.");
        }

        if (!active) return;
        setGallery(data.gallery);
        setStatus("ready");
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to load gallery.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  const toggleFavorite = useCallback(
    async (imageId: string, currentlyFavorite: boolean) => {
      if (!gallery) return;

      setGallery((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          images: prev.images.map((img) =>
            img.id === imageId ? { ...img, isFavorite: !currentlyFavorite } : img
          ),
        };
      });

      try {
        await fetch("/api/client/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token,
            imageId,
            action: currentlyFavorite ? "remove" : "add",
          }),
        });
      } catch {
        setGallery((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map((img) =>
              img.id === imageId ? { ...img, isFavorite: currentlyFavorite } : img
            ),
          };
        });
      }
    },
    [gallery, token]
  );

  const toggleSelection = useCallback(
    async (imageId: string, nextSelected: boolean) => {
      if (!gallery?.showSelectionTools) return;

      setGallery((prev) => {
        if (!prev) return prev;
        const images = prev.images.map((img) =>
          img.id === imageId ? { ...img, isSelected: nextSelected } : img
        );
        return {
          ...prev,
          images,
          selectedCount: images.filter((i) => i.isSelected).length,
        };
      });

      try {
        const res = await fetch("/api/client/selection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            action: "toggle",
            imageId,
            selected: nextSelected,
          }),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error || "Could not update selection.");
        }
      } catch {
        setGallery((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            images: prev.images.map((img) =>
              img.id === imageId ? { ...img, isSelected: !nextSelected } : img
            ),
          };
        });
      }
    },
    [gallery?.showSelectionTools]
  );

  const submitSelections = useCallback(async () => {
    if (!gallery?.showSelectionTools) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/client/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "submit" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Submit failed.");
      setGallery((prev) =>
        prev
          ? {
              ...prev,
              selectionsLocked: true,
              showSelectionTools: false,
              selectionsSubmittedAt: new Date().toISOString(),
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }, [gallery?.showSelectionTools]);

  const downloadImage = useCallback(
    async (imageId: string, quality: "low" | "high") => {
      const key = `${imageId}:${quality}`;
      setDownloading(key);
      try {
        const res = await fetch("/api/client/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, imageId, type: "single", quality }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          downloadUrl?: string;
          filename?: string;
          error?: string;
        };

        if (!data.ok || !data.downloadUrl) {
          throw new Error(data.error || "Download failed.");
        }

        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.filename || "image.jpg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Download failed:", err);
      } finally {
        setDownloading(null);
      }
    },
    [token]
  );

  const downloadVideo = useCallback(
    async (videoId: string) => {
      setDownloading(`video:${videoId}`);
      try {
        const res = await fetch("/api/client/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, type: "single", videoId }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          downloadUrl?: string;
          filename?: string;
          error?: string;
        };
        if (!data.ok || !data.downloadUrl) throw new Error(data.error || "Download failed.");
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.filename || "video.mp4";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Video download failed:", err);
      } finally {
        setDownloading(null);
      }
    },
    [token]
  );

  const downloadFavorites = useCallback(async () => {
    if (!gallery) return;
    setDownloading("favorites");

    try {
      const res = await fetch("/api/client/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, type: "favorites", quality: downloadQuality }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        downloads?: { id: string; url: string; filename: string }[];
        error?: string;
      };

      if (!data.ok || !data.downloads) {
        throw new Error(data.error || "Download failed.");
      }

      for (const file of data.downloads) {
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(null);
    }
  }, [gallery, token, downloadQuality]);

  const downloadDeliveryGroup = useCallback(
    async (deliveryGroup: DeliveryGroup) => {
      if (!gallery) return;
      setDownloading(deliveryGroup);

      try {
        const res = await fetch("/api/client/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token,
            type: "deliveryGroup",
            deliveryGroup,
            quality: downloadQuality,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          downloads?: { id: string; url: string; filename: string }[];
          error?: string;
        };

        if (!data.ok || !data.downloads) {
          throw new Error(data.error || "Download failed.");
        }

        for (const file of data.downloads) {
          const link = document.createElement("a");
          link.href = file.url;
          link.download = file.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error("Download failed:", err);
      } finally {
        setDownloading(null);
      }
    },
    [gallery, token, downloadQuality]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const sortedVideos = useMemo(
    () =>
      [...(gallery?.videos ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [gallery?.videos]
  );

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center">
        <p className="text-sm text-white/70">Loading gallery…</p>
      </div>
    );
  }

  if (status === "error") {
    const expired = httpStatus === 410;
    const forbidden = httpStatus === 403;
    return (
      <div
        className={`rounded-2xl border px-6 py-10 text-center ${
          expired
            ? "border-amber-500/30 bg-amber-500/10"
            : forbidden
              ? "border-white/10 bg-white/[0.04]"
              : "border-red-500/20 bg-red-500/10"
        }`}
      >
        <p
          className={`text-sm ${expired ? "text-amber-100" : forbidden ? "text-white/85" : "text-red-100"}`}
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
        <p
          className={`mt-3 text-xs ${
            expired ? "text-amber-100/85" : forbidden ? "text-white/55" : "text-red-100/80"
          }`}
        >
          {expired
            ? "Ask the studio for a new access window if you still need this gallery."
            : "Please double-check your access code or contact the studio."}
        </p>
      </div>
    );
  }

  if (!gallery) return null;

  const displayedImages =
    viewMode === "favorites"
      ? gallery.images.filter((img) => img.isFavorite)
      : viewMode === "selected"
        ? gallery.images.filter((img) => img.isSelected)
        : gallery.images;

  const favoriteCount = gallery.images.filter((img) => img.isFavorite).length;
  const selectedCount =
    gallery.selectedCount ?? gallery.images.filter((i) => i.isSelected).length;
  const expiresAt = gallery.expiresAt ? new Date(gallery.expiresAt) : null;
  const isExpiringSoon =
    expiresAt && expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const submitted = Boolean(gallery.selectionsSubmittedAt || gallery.selectionsLocked);
  const isFinalDelivery = gallery.galleryType === "FINAL_DELIVERY";
  const deliveryGroups: {
    id: DeliveryGroup;
    label: string;
    title: string;
    description: string;
  }[] = [
    {
      id: "full-res",
      label: "01_FULL_RES",
      title: "Full resolution",
      description: "Print, archive, press, and large-format marketing.",
    },
    {
      id: "web-ready",
      label: "02_WEB_READY",
      title: "Web ready",
      description: "Website, listings, portfolio, blogs, and email.",
    },
    {
      id: "social",
      label: "03_SOCIAL",
      title: "Social",
      description: "Social crops and campaign-ready digital posting.",
    },
    {
      id: "heroes",
      label: "04_SELECTED_HEROES",
      title: "Selected heroes",
      description: "Bright Line recommendations for first impression use.",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="section-kicker">
          {isFinalDelivery ? "Final Image Delivery" : "Client Gallery"}
        </p>
        <h1 className="section-title">{gallery.title}</h1>
        {gallery.description && (
          <p className="section-subtitle">{gallery.description}</p>
        )}
        {(gallery.clientName || gallery.projectTitle) && (
          <p className="text-sm text-mute">
            {gallery.clientName || "Client"}
            {gallery.projectTitle ? ` · ${gallery.projectTitle}` : ""}
          </p>
        )}

        {submitted && gallery.selectionWorkflow ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm text-emerald-100">
              Selections received — thank you. The studio will follow up if needed.
            </p>
          </div>
        ) : null}

        {isExpiringSoon && expiresAt && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-200">
              ⚠️ This gallery expires on{" "}
              {expiresAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        {gallery.clientNotes && (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/50">Notes from studio</p>
            <p className="whitespace-pre-wrap text-sm text-white/80">{gallery.clientNotes}</p>
          </div>
        )}

        {gallery.allowDownload ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-xs uppercase tracking-widest text-white/50">Package downloads</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDownloadQuality("low")}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                  downloadQuality === "low"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Web-ready
              </button>
              <button
                type="button"
                onClick={() => setDownloadQuality("high")}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                  downloadQuality === "high"
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                Full resolution
              </button>
            </div>
            <span className="text-xs text-white/45">Applies to favorites, batches, and delivery sections.</span>
          </div>
        ) : null}
      </header>

      {sortedVideos.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <div>
            <p className="section-kicker">Project video</p>
            <p className="mt-1 text-sm text-white/60">
              Stream in HD after sign-in. Download when enabled for your access link.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-1">
            {sortedVideos.map((v) => (
              <div key={v.id} className="space-y-3">
                <video
                  src={v.url}
                  poster={v.posterUrl ?? undefined}
                  controls
                  playsInline
                  className="w-full max-h-[420px] rounded-xl border border-white/10 bg-black"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-white/80">{v.title?.trim() || v.filename || "Project video"}</p>
                  {gallery.allowDownload && v.allowDownload ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      disabled={downloading === `video:${v.id}`}
                      onClick={() => void downloadVideo(v.id)}
                    >
                      {downloading === `video:${v.id}` ? "Preparing…" : "Download video"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isFinalDelivery ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Ready for use</p>
            <h2 className="mt-2 font-display text-2xl text-white">
              Your final files are organized for download.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Start with WEB_READY for websites and online platforms, FULL_RES for print or archive,
              and SELECTED_HEROES for covers, thumbnails, and first impression placement.
            </p>
            {gallery.deliveredAt ? (
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/40">
                Delivered {new Date(gallery.deliveredAt).toLocaleDateString()}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {deliveryGroups.map((group) => {
              const count = countDeliveryGroup(gallery.images, group.id);
              const disabled =
                !gallery.allowDownload || count === 0 || downloading === group.id;
              const qualityLabel = downloadQuality === "low" ? "web-ready" : "full-res";
              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{group.label}</p>
                  <h3 className="mt-2 text-lg font-medium text-white">{group.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">{group.description}</p>
                  <button
                    type="button"
                    onClick={() => void downloadDeliveryGroup(group.id)}
                    disabled={disabled}
                    className="btn btn-primary mt-4 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloading === group.id
                      ? "Preparing..."
                      : `Download ${count} (${qualityLabel})`}
                  </button>
                </div>
              );
            })}
          </div>

          {gallery.deliveryDriveLink ? (
            <a
              href={gallery.deliveryDriveLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              Open backup Google Drive folder
            </a>
          ) : null}

          <DeliveryUsageGuide usageGuideText={gallery.usageGuideText} />
        </section>
      ) : null}

      {gallery.selectionWorkflow && gallery.showSelectionTools ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <p className="text-sm text-white/80">
            Tap <strong>Select</strong> on images you want in this round. Submit when ready.
            Favorites are optional shortlist markers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary text-xs"
              disabled={submitting || selectedCount === 0}
              onClick={() => void submitSelections()}
            >
              {submitting ? "Submitting…" : `Submit selections (${selectedCount})`}
            </button>
          </div>
        </div>
      ) : null}

      {!isFinalDelivery ? (
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              viewMode === "all"
                ? "bg-black text-white"
                : "bg-white/70 text-black/60 hover:bg-white"
            }`}
          >
            All ({gallery.images.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("favorites")}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              viewMode === "favorites"
                ? "bg-black text-white"
                : "bg-white/70 text-black/60 hover:bg-white"
            }`}
          >
            Favorites ({favoriteCount})
          </button>
          {gallery.selectionWorkflow ? (
            <button
              type="button"
              onClick={() => setViewMode("selected")}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                viewMode === "selected"
                  ? "bg-black text-white"
                  : "bg-white/70 text-black/60 hover:bg-white"
              }`}
            >
              Selected ({selectedCount})
            </button>
          ) : null}
        </div>

        {gallery.allowDownload && favoriteCount > 0 ? (
          <button
            type="button"
            onClick={() => void downloadFavorites()}
            disabled={downloading === "favorites"}
            className="btn btn-ghost text-xs"
          >
            {downloading === "favorites"
              ? "Downloading..."
              : `Download favorites (${favoriteCount}) — ${downloadQuality === "low" ? "web-ready" : "full-res"}`}
          </button>
        ) : null}
      </div>
      ) : null}

      {displayedImages.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center">
          <p className="text-sm text-white/70">
            {viewMode === "favorites"
              ? "No favorites yet. Tap the heart on images to shortlist."
              : viewMode === "selected"
                ? "No selections yet."
                : "No images in this gallery."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedImages.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
            >
              <button
                type="button"
                onClick={() => setLightboxImage(image)}
                className="block w-full cursor-zoom-in"
              >
                <Image
                  src={image.thumbUrl ?? image.url}
                  alt={image.alt || gallery.title}
                  width={800}
                  height={600}
                  data-image-mode={getImageModeForUrl(image.thumbUrl ?? image.url)}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA}
                  className="h-auto w-full object-cover aspect-[4/3]"
                />
              </button>

              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => toggleFavorite(image.id, image.isFavorite)}
                  className={`rounded-full p-2 transition-colors ${
                    image.isFavorite
                      ? "bg-red-500 text-white"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                  aria-label={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={image.isFavorite ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>

                {gallery.showSelectionTools ? (
                  <button
                    type="button"
                    onClick={() => toggleSelection(image.id, !image.isSelected)}
                    className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${
                      image.isSelected
                        ? "bg-white text-black"
                        : "bg-white/20 text-white hover:bg-white/30"
                    }`}
                  >
                    {image.isSelected ? "Selected" : "Select"}
                  </button>
                ) : null}

                {gallery.allowDownload ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => void downloadImage(image.id, "low")}
                      disabled={downloading === `${image.id}:low`}
                      className="rounded-full bg-white/20 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/30 disabled:opacity-50"
                      aria-label="Download web-ready"
                    >
                      Web
                    </button>
                    <button
                      type="button"
                      onClick={() => void downloadImage(image.id, "high")}
                      disabled={!image.storageKey || downloading === `${image.id}:high`}
                      className="rounded-full bg-white/20 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/30 disabled:opacity-50"
                      aria-label="Download full resolution"
                    >
                      Full
                    </button>
                  </div>
                ) : null}
              </div>

              {image.isFavorite ? (
                <div className="absolute top-3 right-3 rounded-full bg-red-500 p-1.5">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="white"
                    stroke="none"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              ) : null}

              {image.isSelected && gallery.selectionWorkflow ? (
                <div className="absolute top-3 left-3 rounded-full bg-black/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Selected
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {lightboxImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxImage(null)}
            aria-label="Close lightbox"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightboxImage.fullUrl ?? lightboxImage.url}
              alt={lightboxImage.alt || gallery.title}
              width={1920}
              height={1280}
              className="max-h-[90vh] w-auto object-contain"
              priority
            />

            {(() => {
              const cap =
                typeof lightboxImage.meta === "object" &&
                lightboxImage.meta &&
                "caption" in lightboxImage.meta &&
                typeof (lightboxImage.meta as { caption?: unknown }).caption === "string"
                  ? (lightboxImage.meta as { caption: string }).caption
                  : null;
              const text = (cap ?? lightboxImage.alt ?? "").trim();
              return text ? (
                <p className="absolute bottom-14 left-1/2 -translate-x-1/2 max-w-2xl px-4 py-2 text-center text-sm text-white/90 bg-black/40 rounded-lg">
                  {text}
                </p>
              ) : null;
            })()}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => toggleFavorite(lightboxImage.id, lightboxImage.isFavorite)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  lightboxImage.isFavorite
                    ? "bg-red-500 text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {lightboxImage.isFavorite ? "♥ Favorited" : "♡ Add to favorites"}
              </button>

              {gallery.showSelectionTools ? (
                <button
                  type="button"
                  onClick={() =>
                    toggleSelection(lightboxImage.id, !lightboxImage.isSelected)
                  }
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    lightboxImage.isSelected
                      ? "bg-white text-black"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {lightboxImage.isSelected ? "Selected" : "Select"}
                </button>
              ) : null}

              {gallery.allowDownload ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => void downloadImage(lightboxImage.id, "low")}
                    disabled={downloading === `${lightboxImage.id}:low`}
                    className="rounded-full bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 disabled:opacity-50"
                  >
                    {downloading === `${lightboxImage.id}:low` ? "…" : "Download web-ready"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadImage(lightboxImage.id, "high")}
                    disabled={
                      !lightboxImage.storageKey ||
                      downloading === `${lightboxImage.id}:high`
                    }
                    className="rounded-full bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 disabled:opacity-50"
                  >
                    {downloading === `${lightboxImage.id}:high` ? "…" : "Download full res"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
