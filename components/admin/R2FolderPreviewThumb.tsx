"use client";

export type R2FolderPreviewData = {
  previewUrls: string[];
  previewKind?: "image" | "video" | "empty";
};

/**
 * Shared 2×2 / single / video / empty folder preview used by Browse R2 and the R2 hub.
 */
export default function R2FolderPreviewThumb({
  folder,
  className = "",
}: {
  folder: R2FolderPreviewData;
  className?: string;
}) {
  const urls = folder.previewUrls.slice(0, 4);
  const kind = folder.previewKind ?? (urls.length ? "image" : "empty");

  if (urls.length === 0) {
    return (
      <div
        className={`flex aspect-square items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.03] text-[0.65rem] uppercase tracking-[0.2em] text-white/40 ${className}`}
      >
        {kind === "video" ? "Video" : "Empty"}
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={`relative aspect-square overflow-hidden rounded-lg bg-black/60 ${className}`}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={urls[0]} muted playsInline preload="metadata" className="h-full w-full object-cover" />
      </div>
    );
  }
  if (urls.length === 1) {
    return (
      <div className={`aspect-square overflow-hidden rounded-lg bg-black/60 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    );
  }
  return (
    <div
      className={`grid aspect-square gap-0.5 overflow-hidden rounded-lg bg-black/60 ${
        urls.length === 2 ? "grid-cols-2 grid-rows-1" : "grid-cols-2 grid-rows-2"
      } ${className}`}
    >
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ))}
    </div>
  );
}
