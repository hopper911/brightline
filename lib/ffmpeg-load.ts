/**
 * Shared browser loader for @ffmpeg/ffmpeg (admin Video Port + background web encode).
 *
 * Next/webpack rewrites the package's `new Worker(new URL("./worker.js", …))` in a way that
 * breaks `import(blob:…)` of ffmpeg-core inside the worker. Serve a pristine worker from
 * `/public/ffmpeg` and pass an absolute `classWorkerURL` so the untouched worker runs.
 *
 * Failed loads reject with a string (worker posts `e.toString()`), not an Error — callers
 * should use the message from this helper.
 */

export type FfmpegLoadProgress = (message: string) => void;

function errDetail(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  try {
    const s = String(err);
    return s && s !== "[object Object]" ? s : "unknown";
  } catch {
    return "unknown";
  }
}

type FFmpegInstance = InstanceType<typeof import("@ffmpeg/ffmpeg").FFmpeg>;

async function tryLoad(
  preferBlob: boolean,
  coreBaseURL: string,
  classWorkerURL: string
): Promise<FFmpegInstance> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();

  const coreSrc = `${coreBaseURL}/ffmpeg-core.js`;
  const wasmSrc = `${coreBaseURL}/ffmpeg-core.wasm`;
  const coreURL = preferBlob ? await toBlobURL(coreSrc, "text/javascript") : coreSrc;
  const wasmURL = preferBlob ? await toBlobURL(wasmSrc, "application/wasm") : wasmSrc;

  await ffmpeg.load({
    coreURL,
    wasmURL,
    classWorkerURL,
  });
  return ffmpeg;
}

/**
 * Load ffmpeg.wasm with same-origin cores first, CDN ESM fallback.
 */
export async function loadFfmpegBrowser(onProgress?: FfmpegLoadProgress): Promise<FFmpegInstance> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const localBase = `${origin}/ffmpeg`;
  const cdnBase = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
  // Absolute URL required: library does `new URL(classWorkerURL, import.meta.url)`.
  const classWorkerURL = `${localBase}/worker.js`;

  const attempts: Array<{ label: string; run: () => Promise<FFmpegInstance> }> = [
    {
      label: "site",
      run: async () => {
        const probe = await fetch(`${localBase}/ffmpeg-core.wasm`, { method: "HEAD" });
        if (!probe.ok) throw new Error(`Local core missing (${probe.status})`);
        return tryLoad(false, localBase, classWorkerURL);
      },
    },
    {
      label: "site-blob",
      run: () => tryLoad(true, localBase, classWorkerURL),
    },
    {
      label: "CDN",
      run: () => tryLoad(true, cdnBase, classWorkerURL),
    },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    onProgress?.(`Loading encoder (${attempt.label})…`);
    try {
      return await attempt.run();
    } catch (err) {
      failures.push(`${attempt.label}: ${errDetail(err)}`);
    }
  }

  throw new Error(
    `Could not load WASM encoder (${failures.join(" → ") || "unknown"}). Hard-refresh and retry, or try a smaller clip.`
  );
}
