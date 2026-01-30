"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { getImageModeForUrl } from "@/lib/image-strategy";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type GalleryImage = {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
  storageKey?: string | null;
};

type GalleryPayload = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
  clientName?: string | null;
  projectTitle?: string | null;
  images: GalleryImage[];
};

export default function ClientGalleryView({ token }: { token: string }) {
  const [gallery, setGallery] = useState<GalleryPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">(
    "loading"
  );
  const [error, setError] = useState("");

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
          body: JSON.stringify({ token }),
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

        Sentry.addBreadcrumb({
          category: "client",
          message: "Client gallery access failed",
          level: "error",
        });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

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

  return (
    <div className="space-y-10">
      <header>
        <p className="section-kicker">Client Gallery</p>
        <h1 className="section-title">{gallery.title}</h1>
        {gallery.description ? (
          <p className="section-subtitle">{gallery.description}</p>
        ) : null}
        {(gallery.clientName || gallery.projectTitle) && (
          <p className="mt-4 text-sm text-mute">
            {gallery.clientName || "Client"}
            {gallery.projectTitle ? ` · ${gallery.projectTitle}` : ""}
          </p>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {gallery.images.map((image) => (
          <div
            key={image.id}
            className="card-luxe overflow-hidden"
          >
            <Image
              src={image.url}
              alt={image.alt || gallery.title}
              width={1600}
              height={1100}
              data-image-mode={getImageModeForUrl(image.url)}
              sizes="(min-width: 1024px) 45vw, 100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
