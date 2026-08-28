export type MediaErrorCode = "not_found" | "configuration" | "upload" | "download" | "invalid_key";

export class MediaError extends Error {
  readonly code: MediaErrorCode;

  constructor(message: string, code: MediaErrorCode, cause?: unknown) {
    super(message);
    this.name = "MediaError";
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class MediaNotFoundError extends MediaError {
  constructor(message = "Media object not found.", cause?: unknown) {
    super(message, "not_found", cause);
    this.name = "MediaNotFoundError";
  }
}

export class MediaConfigurationError extends MediaError {
  constructor(message = "Media storage is not configured.", cause?: unknown) {
    super(message, "configuration", cause);
    this.name = "MediaConfigurationError";
  }
}

export class MediaUploadError extends MediaError {
  constructor(message = "Media upload signing failed.", cause?: unknown) {
    super(message, "upload", cause);
    this.name = "MediaUploadError";
  }
}

export class MediaDownloadError extends MediaError {
  constructor(message = "Media download signing failed.", cause?: unknown) {
    super(message, "download", cause);
    this.name = "MediaDownloadError";
  }
}

export function isMediaError(value: unknown): value is MediaError {
  return value instanceof MediaError;
}
