/**
 * Browser helpers for Video Port file drops / pickers.
 * Handles Live Photo stills, folder drops, and mislabeled containers.
 */

import { isAcceptedVideoFile } from "@/lib/video-port/keys";

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|dng)$/i;
const VIDEO_MAGIC_EXT = /\.(mp4|m4v|mov|webm|mkv|avi|mpe?g|3gp|mts|m2ts)$/i;

export function isLikelyStillImage(file: { name: string; type?: string }): boolean {
  const type = (file.type || "").toLowerCase().trim();
  if (type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name || "");
}

/** Human-readable why a file was skipped (empty string = accept). */
export function rejectReasonForFile(file: { name: string; type?: string }): string | null {
  if (isAcceptedVideoFile(file)) return null;
  const name = file.name || "(unnamed)";
  if (/\.livp$/i.test(name)) {
    return `${name} is a Live Photo package — unzip it or export the .MOV from Photos.`;
  }
  if (isLikelyStillImage(file)) {
    // UUID_…_c.jpeg is a common Photos / Live Photo still export.
    return `${name} is a photo still, not a video. Export Unmodified Original (.MOV) from Photos, or drop an MP4/MOV file.`;
  }
  return `${name} is not a supported video. Use MP4, MOV, or WebM.`;
}

/**
 * True when the first bytes look like MP4/MOV/M4V (ftyp) or WebM/Matroska.
 * Used when the OS lies about MIME/extension (iCloud placeholders, rename mistakes).
 */
export async function looksLikeVideoByMagic(file: File): Promise<boolean> {
  try {
    const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (buf.length < 8) return false;
    // ....ftyp
    if (
      buf[4] === 0x66 &&
      buf[5] === 0x74 &&
      buf[6] === 0x79 &&
      buf[7] === 0x70
    ) {
      return true;
    }
    // EBML (Matroska / WebM) 0x1A45DFA3
    if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
      return true;
    }
    // RIFF....AVI / sometimes WebM wrappers
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      VIDEO_MAGIC_EXT.test(file.name)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function isUsableVideoFile(file: File): Promise<boolean> {
  if (isAcceptedVideoFile(file)) return true;
  // Never treat clear images as video even if magic sniff fails open.
  if (isLikelyStillImage(file) && !VIDEO_MAGIC_EXT.test(file.name)) {
    return false;
  }
  return looksLikeVideoByMagic(file);
}

async function walkDirectoryEntry(
  entry: FileSystemDirectoryEntry,
  out: File[]
): Promise<void> {
  const reader = entry.createReader();
  for (;;) {
    const batch: FileSystemEntry[] = await new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch.length) break;
    for (const child of batch) {
      await walkEntry(child, out);
    }
  }
}

async function walkEntry(entry: FileSystemEntry | null | undefined, out: File[]): Promise<void> {
  if (!entry) return;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    out.push(file);
    return;
  }
  if (entry.isDirectory) {
    await walkDirectoryEntry(entry as FileSystemDirectoryEntry, out);
  }
}

/** Collect files from a drop, including nested folder entries when available. */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const items = dt.items ? Array.from(dt.items) : [];

  if (items.length) {
    const tasks: Promise<void>[] = [];
    for (const item of items) {
      if (item.kind !== "file") continue;
      const entry =
        typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null;
      if (entry) {
        tasks.push(walkEntry(entry, out));
      } else {
        const file = item.getAsFile();
        if (file) out.push(file);
      }
    }
    await Promise.all(tasks);
  }

  if (out.length) return out;
  return dt.files?.length ? Array.from(dt.files) : [];
}

export type VideoDropPartition = {
  videos: File[];
  skippedReasons: string[];
  ignoredStills: number;
};

/**
 * Prefer real videos; ignore companion stills when a video is present in the same drop
 * (common when exporting Live Photo pairs).
 */
export async function partitionVideoDrop(files: File[]): Promise<VideoDropPartition> {
  const videos: File[] = [];
  const stills: File[] = [];
  const skippedReasons: string[] = [];

  for (const file of files) {
    if (await isUsableVideoFile(file)) {
      videos.push(file);
      continue;
    }
    if (isLikelyStillImage(file)) {
      stills.push(file);
      continue;
    }
    const reason = rejectReasonForFile(file);
    if (reason) skippedReasons.push(reason);
  }

  // If we have videos, silently count still companions instead of erroring the whole drop.
  if (videos.length && stills.length) {
    return { videos, skippedReasons, ignoredStills: stills.length };
  }

  for (const still of stills) {
    const reason = rejectReasonForFile(still);
    if (reason) skippedReasons.push(reason);
  }

  return { videos, skippedReasons, ignoredStills: 0 };
}
