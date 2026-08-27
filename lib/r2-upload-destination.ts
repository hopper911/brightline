/**
 * R2 hub upload destination: Site → Project → Folder.
 * Resolves T9 sibling prefixes on the Brightline bucket (portfolio/ or mirotech/).
 */

import {
  defaultSegmentForRoot,
  isValidSegment,
  segmentLabel,
  segmentsForRoot,
} from "@/lib/t9-media-segments";
import {
  isT9MediaRoot,
  normalizeT9MediaRoot,
  type T9MediaRoot,
} from "@/lib/t9-media-root";

export const R2_UPLOAD_QUALITIES = ["web_full", "web_thumb", "web_video"] as const;
export type R2UploadQuality = (typeof R2_UPLOAD_QUALITIES)[number];

export type R2UploadDestination = {
  root: T9MediaRoot;
  segment: string;
  quality: R2UploadQuality;
};

export const R2_UPLOAD_DEST_STORAGE_KEY = "brightline:r2-upload-dest:v1";

export const R2_UPLOAD_SITE_OPTIONS = [
  { id: "portfolio" as const, label: "Brightline portfolio" },
  { id: "mirotech" as const, label: "Mirotech T9" },
] as const;

export const R2_UPLOAD_QUALITY_OPTIONS: Array<{ id: R2UploadQuality; label: string; hint: string }> = [
  { id: "web_full", label: "web_full", hint: "Images — writes paired web_thumb" },
  { id: "web_thumb", label: "web_thumb", hint: "Thumbs only (rare)" },
  { id: "web_video", label: "web_video", hint: "Videos — encode to MP4 + poster" },
];

export function isR2UploadQuality(value: unknown): value is R2UploadQuality {
  return typeof value === "string" && (R2_UPLOAD_QUALITIES as readonly string[]).includes(value);
}

export function normalizeR2UploadQuality(
  value: unknown,
  kind: "image" | "video" | "all" = "image"
): R2UploadQuality {
  if (isR2UploadQuality(value)) return value;
  return kind === "video" ? "web_video" : "web_full";
}

export function defaultUploadDestination(
  kind: "image" | "video" | "all" = "image"
): R2UploadDestination {
  const root: T9MediaRoot = "portfolio";
  return {
    root,
    segment: defaultSegmentForRoot(root),
    quality: kind === "video" ? "web_video" : "web_full",
  };
}

export function normalizeUploadDestination(
  input: Partial<R2UploadDestination> | null | undefined,
  kind: "image" | "video" | "all" = "image"
): R2UploadDestination {
  const root = normalizeT9MediaRoot(input?.root);
  const segment = isValidSegment(root, input?.segment)
    ? String(input!.segment).toLowerCase().trim()
    : defaultSegmentForRoot(root);
  let quality = normalizeR2UploadQuality(input?.quality, kind);
  // Images should not default into web_video; videos should not land in web_full via dest panel.
  if (kind === "image" && quality === "web_video") quality = "web_full";
  if (kind === "video" && quality !== "web_video") quality = "web_video";
  return { root, segment, quality };
}

/** `{root}/{segment}/{quality}/` e.g. portfolio/arc/web_full/ */
export function resolveUploadPrefix(dest: R2UploadDestination): string {
  // kind "all" preserves explicit quality (no image/video coercion).
  const normalized = normalizeUploadDestination(dest, "all");
  return `${normalized.root}/${normalized.segment}/${normalized.quality}/`;
}

export function formatUploadDestinationLabel(dest: R2UploadDestination): string {
  const normalized = normalizeUploadDestination(dest);
  const site =
    normalized.root === "portfolio" ? "Brightline" : "Mirotech T9";
  const project = segmentLabel(normalized.root, normalized.segment);
  return `${site} · ${project} · ${normalized.quality}`;
}

export function projectOptionsForRoot(root: T9MediaRoot) {
  return segmentsForRoot(root);
}

export function parseUploadDestinationFromSearch(params: {
  root?: string;
  segment?: string;
  quality?: string;
  pillar?: string;
}): Partial<R2UploadDestination> {
  const root = isT9MediaRoot(params.root) ? params.root : undefined;
  const segment = params.segment || params.pillar;
  const quality = isR2UploadQuality(params.quality) ? params.quality : undefined;
  return {
    ...(root ? { root } : {}),
    ...(segment ? { segment } : {}),
    ...(quality ? { quality } : {}),
  };
}

export function loadUploadDestinationFromSession(): R2UploadDestination | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(R2_UPLOAD_DEST_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<R2UploadDestination>;
    return normalizeUploadDestination(parsed);
  } catch {
    return null;
  }
}

export function saveUploadDestinationToSession(dest: R2UploadDestination): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      R2_UPLOAD_DEST_STORAGE_KEY,
      JSON.stringify(normalizeUploadDestination(dest))
    );
  } catch {
    /* ignore quota */
  }
}

export function detectUploadFileKind(file: File): "image" | "video" | "other" {
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(name)) return "image";
  if (type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(name)) return "video";
  if (/\.(heic|heif)$/i.test(name) || type === "image/heic" || type === "image/heif") {
    return "other";
  }
  return "other";
}

export const R2_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
