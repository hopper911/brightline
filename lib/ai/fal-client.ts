/**
 * Minimal fal.ai queue client (HTTP). Auth via FAL_KEY.
 * Docs: https://fal.ai/docs/model-apis/inference/queue
 */

const FAL_QUEUE_BASE = "https://queue.fal.run";

/** Cost-conscious default: Kling v3 Standard image-to-video (~5s). */
export const FAL_IMAGE_TO_VIDEO_MODEL =
  process.env.FAL_IMAGE_TO_VIDEO_MODEL?.trim() ||
  "fal-ai/kling-video/v3/standard/image-to-video";

function getFalKey(): string {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    throw Object.assign(new Error("FAL_KEY is not configured."), { status: 503 });
  }
  return key;
}

async function falFetch(path: string, init?: RequestInit) {
  const key = getFalKey();
  const res = await fetch(`${FAL_QUEUE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "detail" in json
        ? String((json as { detail: unknown }).detail)
        : json && typeof json === "object" && "error" in json
          ? String((json as { error: unknown }).error)
          : `fal request failed (${res.status})`;
    throw Object.assign(new Error(message), { status: res.status >= 400 ? res.status : 502 });
  }
  return json as Record<string, unknown>;
}

export type FalQueueSubmitResult = {
  requestId: string;
  status: string;
};

export async function falQueueSubmit(
  modelId: string,
  input: Record<string, unknown>
): Promise<FalQueueSubmitResult> {
  // queue.fal.run expects `{ input: … }`, not a flat model payload
  const data = await falFetch(`/${modelId}`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
  const requestId =
    (typeof data.request_id === "string" && data.request_id) ||
    (typeof data.requestId === "string" && data.requestId) ||
    "";
  if (!requestId) {
    throw Object.assign(new Error("fal did not return a request id."), { status: 502 });
  }
  return {
    requestId,
    status: typeof data.status === "string" ? data.status : "IN_QUEUE",
  };
}

export type FalQueueStatus =
  | "IN_QUEUE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | string;

export async function falQueueStatus(
  modelId: string,
  requestId: string
): Promise<{ status: FalQueueStatus; raw: Record<string, unknown> }> {
  const data = await falFetch(`/${modelId}/requests/${encodeURIComponent(requestId)}/status`);
  const status = typeof data.status === "string" ? data.status : "IN_PROGRESS";
  return { status, raw: data };
}

export async function falQueueResult(
  modelId: string,
  requestId: string
): Promise<Record<string, unknown>> {
  return falFetch(`/${modelId}/requests/${encodeURIComponent(requestId)}`);
}

/** Extract MP4 URL from typical fal video payloads. */
export function extractFalVideoUrl(result: Record<string, unknown>): string | null {
  const video = result.video;
  if (video && typeof video === "object") {
    const url = (video as { url?: unknown }).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  if (typeof result.video_url === "string" && result.video_url.trim()) {
    return result.video_url.trim();
  }
  const data = result.data;
  if (data && typeof data === "object") {
    return extractFalVideoUrl(data as Record<string, unknown>);
  }
  return null;
}

export function isFalConfigured(): boolean {
  return Boolean(process.env.FAL_KEY?.trim());
}
