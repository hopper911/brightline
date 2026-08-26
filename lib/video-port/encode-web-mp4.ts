/**
 * Browser-side Video Port encode — H.264 1080p + optional poster WebP.
 * Original never uploads; only the encode leaves the browser.
 */

import { loadFfmpegBrowser } from "@/lib/ffmpeg-load";
import { VIDEO_PORT_LONG_EDGE, VIDEO_PORT_POSTER_MAX_EDGE } from "@/lib/video-port/keys";

export type VideoPortEncodeProgress = {
  phase: "loading" | "encoding" | "poster" | "done";
  ratio: number;
  message: string;
};

export type VideoPortEncodeResult = {
  videoBlob: Blob;
  posterBlob: Blob | null;
  fileName: string;
};

function extensionFor(name: string): string {
  const m = name.match(/\.[a-z0-9]+$/i);
  return m?.[0]?.toLowerCase() || ".mp4";
}

function uint8ToBlob(data: Uint8Array | string, type: string): Blob {
  const bytes =
    data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}

/**
 * Encode a local video File to H.264 MP4 (long edge ≤ 1920) + optional poster WebP.
 */
export async function encodeVideoPortWebMp4(
  file: File,
  onProgress?: (p: VideoPortEncodeProgress) => void
): Promise<VideoPortEncodeResult> {
  onProgress?.({ phase: "loading", ratio: 0, message: "Loading encoder…" });

  const { fetchFile } = await import("@ffmpeg/util");
  const ffmpeg = await loadFfmpegBrowser((message) => {
    onProgress?.({ phase: "loading", ratio: 0, message });
  });

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.({
      phase: "encoding",
      ratio: Math.min(1, Math.max(0, progress)),
      message: `Encoding web MP4… ${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
    });
  });

  const inputName = "input" + extensionFor(file.name);
  const outputName = "web.mp4";
  const posterPng = "poster.png";
  const posterWebp = "poster.webp";

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  onProgress?.({ phase: "encoding", ratio: 0.02, message: "Encoding web MP4…" });

  const scale = `scale='min(${VIDEO_PORT_LONG_EDGE},iw)':'min(${VIDEO_PORT_LONG_EDGE},ih)':force_original_aspect_ratio=decrease`;

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
    throw new Error("Web encode failed. Try a shorter clip or a different container (MP4/MOV).");
  }

  const videoData = await ffmpeg.readFile(outputName);
  const videoBlob = uint8ToBlob(videoData, "video/mp4");

  let posterBlob: Blob | null = null;
  onProgress?.({ phase: "poster", ratio: 0.92, message: "Extracting poster frame…" });
  try {
    const posterScale = `scale='min(${VIDEO_PORT_POSTER_MAX_EDGE},iw)':'min(${VIDEO_PORT_POSTER_MAX_EDGE},ih)':force_original_aspect_ratio=decrease`;
    const posterCode = await ffmpeg.exec([
      "-i",
      outputName,
      "-ss",
      "0.5",
      "-frames:v",
      "1",
      "-vf",
      posterScale,
      posterPng,
    ]);
    if (posterCode === 0) {
      // ffmpeg.wasm core may not include libwebp encoder; fall back to PNG if needed.
      const webpCode = await ffmpeg.exec(["-i", posterPng, "-q:v", "80", posterWebp]);
      if (webpCode === 0) {
        const posterData = await ffmpeg.readFile(posterWebp);
        posterBlob = uint8ToBlob(posterData, "image/webp");
      } else {
        const posterData = await ffmpeg.readFile(posterPng);
        posterBlob = uint8ToBlob(posterData, "image/png");
      }
    }
  } catch {
    posterBlob = null;
  }

  try {
    ffmpeg.terminate();
  } catch {
    /* ignore */
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "clip";
  onProgress?.({ phase: "done", ratio: 1, message: "Encode ready." });
  return {
    videoBlob,
    posterBlob,
    fileName: `${base}-web-1080.mp4`,
  };
}
