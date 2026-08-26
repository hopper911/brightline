/**
 * Browser-side web encode for site background masters (admin only).
 * Scales so the long edge is ≤ 1920 and writes H.264 + AAC MP4 with faststart.
 *
 * Requires CSP `script-src` to include `'wasm-unsafe-eval'` (Chrome) and
 * `connect-src` access to the ffmpeg core CDN (or same-origin cores).
 * Worker must be served from `/public/ffmpeg/worker.js` (see `lib/ffmpeg-load.ts`).
 */

import { loadFfmpegBrowser } from "@/lib/ffmpeg-load";
import { SITE_BG_WEB_LONG_EDGE } from "@/lib/site-background-share";

export type WebEncodeProgress = {
  phase: "loading" | "encoding" | "done";
  ratio: number;
  message: string;
};

export async function encodeBackgroundWebMp4(
  file: File,
  onProgress?: (p: WebEncodeProgress) => void
): Promise<{ blob: Blob; fileName: string }> {
  onProgress?.({ phase: "loading", ratio: 0, message: "Loading encoder…" });

  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await loadFfmpegBrowser((message) => {
    onProgress?.({ phase: "loading", ratio: 0, message });
  });

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      phase: "encoding",
      ratio: Math.min(1, Math.max(0, progress)),
      message: `Encoding web version… ${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
    });
  });

  const inputName = "input" + extensionFor(file.name);
  const outputName = "web.mp4";
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.({ phase: "encoding", ratio: 0.02, message: "Encoding web version…" });

  const scale = `scale='min(${SITE_BG_WEB_LONG_EDGE},iw)':'min(${SITE_BG_WEB_LONG_EDGE},ih)':force_original_aspect_ratio=decrease`;

  const code = await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    scale,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  if (code !== 0) {
    throw new Error("Web encode failed. Try a smaller master or upload a web MP4 via Choose from R2.");
  }

  const data = await ffmpeg.readFile(outputName);
  const bytes =
    data instanceof Uint8Array
      ? data
      : new TextEncoder().encode(String(data));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: "video/mp4" });
  try {
    ffmpeg.terminate();
  } catch {
    /* ignore */
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "background";
  onProgress?.({ phase: "done", ratio: 1, message: "Web encode ready." });
  return { blob, fileName: `${base}-web-1080.mp4` };
}

function extensionFor(name: string): string {
  const m = name.match(/\.[a-z0-9]+$/i);
  return m?.[0]?.toLowerCase() || ".mp4";
}

/** Read duration / dimensions from a local video File (no upload). */
export function readVideoFileMeta(file: File): Promise<{
  durationSec: number | null;
  width: number | null;
  height: number | null;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const durationSec = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      const width = video.videoWidth || null;
      const height = video.videoHeight || null;
      URL.revokeObjectURL(url);
      resolve({ durationSec, width, height });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ durationSec: null, width: null, height: null });
    };
    video.src = url;
  });
}
