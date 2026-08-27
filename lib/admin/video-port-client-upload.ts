/** Client-side Video Port upload (encoded MP4 + optional poster) for Studio Hub hero, etc. */

function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errorFrom(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
}

export async function uploadEncodedVideoPort(
  videoBlob: Blob,
  segment: string,
  root: "portfolio" | "mirotech",
  withPoster: boolean
): Promise<{ videoKey: string; posterKey: string | null }> {
  const initRes = await adminFetch("/api/admin/video-port/multipart/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pillar: segment,
      root,
      bytes: videoBlob.size,
      withPoster,
    }),
  });
  const init = await readJson(initRes);
  if (
    !initRes.ok ||
    init.ok !== true ||
    typeof init.videoKey !== "string" ||
    typeof init.stagingPrefix !== "string"
  ) {
    throw new Error(errorFrom(init, "Could not start upload."));
  }

  const videoKey = init.videoKey;
  const stagingPrefix = init.stagingPrefix;
  const posterKey = typeof init.posterKey === "string" ? init.posterKey : null;
  const partSize =
    typeof init.partSize === "number" && init.partSize > 0 ? init.partSize : 3 * 1024 * 1024;
  const totalParts = Math.max(1, Math.ceil(videoBlob.size / partSize));

  try {
    for (let i = 0; i < totalParts; i++) {
      const chunk = videoBlob.slice(i * partSize, Math.min(videoBlob.size, (i + 1) * partSize));
      const form = new FormData();
      form.set("stagingPrefix", stagingPrefix);
      form.set("partNumber", String(i + 1));
      form.set("chunk", chunk, `part-${i + 1}`);
      const partRes = await adminFetch("/api/admin/video-port/multipart/part", {
        method: "POST",
        body: form,
      });
      const partData = await readJson(partRes);
      if (!partRes.ok || partData.ok !== true) {
        throw new Error(errorFrom(partData, `Chunk ${i + 1} failed.`));
      }
    }

    const doneRes = await adminFetch("/api/admin/video-port/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoKey,
        stagingPrefix,
        contentType: "video/mp4",
        totalParts,
      }),
    });
    const done = await readJson(doneRes);
    if (!doneRes.ok || done.ok !== true) {
      throw new Error(errorFrom(done, "Could not assemble upload."));
    }
  } catch (err) {
    await adminFetch("/api/admin/video-port/multipart/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoKey,
        stagingPrefix,
        totalParts,
        abort: true,
      }),
    }).catch(() => undefined);
    throw err;
  }

  return { videoKey, posterKey };
}

export async function uploadVideoPortPoster(posterBlob: Blob, posterKey: string): Promise<string> {
  const key =
    posterBlob.type === "image/png" && posterKey.endsWith(".webp")
      ? posterKey.replace(/\.webp$/i, ".png")
      : posterKey;
  const form = new FormData();
  form.set("posterKey", key);
  form.set(
    "file",
    posterBlob,
    key.endsWith(".png") ? "poster.png" : "poster.webp"
  );
  const res = await adminFetch("/api/admin/video-port/poster", {
    method: "POST",
    body: form,
  });
  const data = await readJson(res);
  if (!res.ok || data.ok !== true || typeof data.posterKey !== "string") {
    throw new Error(errorFrom(data, "Poster upload failed."));
  }
  return data.posterKey;
}
