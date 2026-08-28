import {
  MediaConfigurationError,
  MediaDownloadError,
  MediaNotFoundError,
  MediaUploadError,
  type MediaError,
} from "@/lib/platform/media/errors";

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    e.name === "NotFound" ||
    e.name === "NoSuchKey" ||
    e.Code === "NoSuchKey" ||
    e.Code === "NotFound" ||
    e.$metadata?.httpStatusCode === 404
  );
}

function isConfigurationMessage(message: string): boolean {
  return /not configured|credentials|R2_|MIROTECH_R2_/i.test(message);
}

/** Map infrastructure errors to platform media errors (server-side logging keeps cause). */
export function normalizeMediaError(error: unknown, operation: string): MediaError {
  if (isNotFoundError(error)) {
    return new MediaNotFoundError(`Media object not found during ${operation}.`, error);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (isConfigurationMessage(message)) {
    return new MediaConfigurationError(message, error);
  }

  if (operation === "signPut" || operation === "createUpload") {
    return new MediaUploadError(message, error);
  }

  if (operation === "signGet" || operation === "createDownloadUrl") {
    return new MediaDownloadError(message, error);
  }

  return new MediaDownloadError(`Media ${operation} failed: ${message}`, error);
}

export { isNotFoundError };
