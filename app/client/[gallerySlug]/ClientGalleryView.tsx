"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import * as Sentry from "@sentry/nextjs";
import { getImageModeForUrl } from "@/lib/image-utils";

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
  isFavorite: boolean;
  meta?: { caption?: string } | Record<string, unknown> | null;
};

type GalleryPayload = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  clientNotes?: string | null;
  coverUrl?: string | null;
  clientName?: string | null;
  projectTitle?: string | null;
  images: GalleryImage[];
  allowDownload: boolean;
  expiresAt?: string | null;
};

type ViewMode = "all" | "favorites";

export default function ClientGalleryView({ gallerySlug }: { gallerySlug: string }) {
  const [gallery, setGallery] = useState<GalleryPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        Sentry.addBreadcrumb({
          category: "client",
          message: "Client gallery access attempt",
          level: "info",
        });
        const res = await fetch("/api/client/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
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

        Sentry.addBreadcrumb({
          category: "client",
          message: "Client gallery access success",
          level: "info",
        });
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to load gallery.");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [gallerySlug]);

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
          body: JSON.stringify({
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
    [gallery]
  );

  const downloadImage = useCallback(async (imageId: string) => {
    setDownloading(imageId);
    try {
      const res = await fetch("/api/client/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId, type: "single" }),
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
  }, []);

  const downloadFavorites = useCallback(async () => {
    if (!gallery) return;
    setDownloading("favorites");

    try {
      const res = await fetch("/api/client/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "favorites" }),
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
  }, [gallery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxImage(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 px-6 py-10 text-center">
        <p className="text-sm text-black/60">Loading gallery…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-10 text-center">
        <p className="text-sm text-red-200" role="alert" aria-live="polite">
          {error}
        </p>
        <p className="mt-3 text-xs text-red-200/70">
          Please double-check your access code or contact the studio.
        </p>
      </div>
    );
  }

  if (!gallery) return null;

  const displayedImages =
    viewMode === "favorites"
      ? gallery.images.filter((img) => img.isFavorite)
      : gallery.images;

  const favoriteCount = gallery.images.filter((img) => img.isFavorite).length;
  const expiresAt = gallery.expiresAt ? new Date(gallery.expiresAt) : null;
  const isExpiringSoon =
    expiresAt && expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="section-kicker">Client Gallery</p>
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
          <div className="rounded-xl border border-black/10 bg-white/70 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-black/50 mb-2">
              Notes from studio
            </p>
            <p className="text-sm text-black/80 whitespace-pre-wrap">
              {gallery.clientNotes}
            </p>
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div className="flex gap-2">
          <button
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
            onClick={() => setViewMode("favorites")}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
              viewMode === "favorites"
                ? "bg-black text-white"
                : "bg-white/70 text-black/60 hover:bg-white"
            }`}
          >
            Favorites ({favoriteCount})
          </button>
        </div>

        {gallery.allowDownload && favoriteCount > 0 && (
          <button
            onClick={downloadFavorites}
            disabled={downloading === "favorites"}
            className="btn btn-ghost text-xs"
          >
            {downloading === "favorites"
              ? "Downloading..."
              : `Download favorites (${favoriteCount})`}
          </button>
        )}
      </div>

      {displayedImages.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 px-6 py-10 text-center">
          <p className="text-sm text-black/60">
            {viewMode === "favorites"
              ? "No favorites yet. Click the heart icon on images to add them."
              : "No images in this gallery."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedImages.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white/70"
            >
              <button
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

                {gallery.allowDownload && (
                  <button
                    onClick={() => downloadImage(image.id)}
                    disabled={downloading === image.id}
                    className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30 disabled:opacity-50"
                    aria-label="Download image"
                  >
                    {downloading === image.id ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="animate-spin"
                      >
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {image.isFavorite && (
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
              )}
            </div>
          ))}
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
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

            {(lightboxImage.meta?.caption ?? lightboxImage.alt) && (
              <p className="absolute bottom-14 left-1/2 -translate-x-1/2 max-w-2xl px-4 py-2 text-center text-sm text-white/90 bg-black/40 rounded-lg">
                {lightboxImage.meta?.caption ?? lightboxImage.alt}
              </p>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              <button
                onClick={() => toggleFavorite(lightboxImage.id, lightboxImage.isFavorite)}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  lightboxImage.isFavorite
                    ? "bg-red-500 text-white"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {lightboxImage.isFavorite ? "♥ Favorited" : "♡ Add to favorites"}
              </button>

              {gallery.allowDownload && (
                <button
                  onClick={() => downloadImage(lightboxImage.id)}
                  disabled={downloading === lightboxImage.id}
                  className="rounded-full bg-white/20 px-4 py-2 text-sm text-white hover:bg-white/30 disabled:opacity-50"
                >
                  {downloading === lightboxImage.id ? "Downloading..." : "Download"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
