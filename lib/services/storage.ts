import { getSignedUploadUrl, getSignedDownloadUrl } from "@/lib/storage";

export type UploadPayload = {
  action: "upload";
  key: string;
  contentType?: string;
  cacheControl?: string;
  expiresIn?: number;
  metadata?: Record<string, string>;
};

export type DownloadPayload = {
  action: "download";
  key: string;
  expiresIn?: number;
  responseContentType?: string;
  responseCacheControl?: string;
  responseContentDisposition?: string;
};

export type StoragePayload = UploadPayload | DownloadPayload;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getMetadata(value: unknown) {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value).filter(([, v]) => typeof v === "string");
  if (!entries.length) return undefined;
  return Object.fromEntries(entries.map(([k, v]) => [k, String(v)]));
}

export function normalizeStoragePayload(body: unknown) {
  const data = body as StoragePayload | null;
  return {
    action: getString(data?.action),
    key: getString(data?.key),
    contentType: getString((data as UploadPayload | null)?.contentType) || undefined,
    cacheControl: getString((data as UploadPayload | null)?.cacheControl) || undefined,
    expiresIn: getNumber((data as UploadPayload | DownloadPayload | null)?.expiresIn),
    metadata: getMetadata((data as UploadPayload | null)?.metadata),
    responseContentType:
      getString((data as DownloadPayload | null)?.responseContentType) || undefined,
    responseCacheControl:
      getString((data as DownloadPayload | null)?.responseCacheControl) || undefined,
    responseContentDisposition:
      getString((data as DownloadPayload | null)?.responseContentDisposition) || undefined,
  };
}

export async function handleStorage(payload: ReturnType<typeof normalizeStoragePayload>) {
  if (!payload.action || !payload.key) {
    return { ok: false, error: "Missing action or key." } as const;
  }

  if (payload.action === "upload") {
    const url = await getSignedUploadUrl({
      key: payload.key,
      contentType: payload.contentType,
      cacheControl: payload.cacheControl,
      expiresIn: payload.expiresIn,
      metadata: payload.metadata,
    });
    return { ok: true, data: url } as const;
  }

  if (payload.action === "download") {
    const url = await getSignedDownloadUrl({
      key: payload.key,
      expiresIn: payload.expiresIn,
      responseContentType: payload.responseContentType,
      responseCacheControl: payload.responseCacheControl,
      responseContentDisposition: payload.responseContentDisposition,
    });
    return { ok: true, data: url } as const;
  }

  return { ok: false, error: "Invalid action." } as const;
}
