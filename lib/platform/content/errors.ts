/**
 * Normalized content boundary errors (Phase 5B).
 * Do not leak HTTP/Prisma implementation details in messages.
 */

export type ContentErrorCode =
  | "not_found"
  | "tenant_mismatch"
  | "unsupported_type"
  | "invalid_ref"
  | "configuration";

export class ContentError extends Error {
  readonly code: ContentErrorCode;

  constructor(message: string, code: ContentErrorCode, cause?: unknown) {
    super(message);
    this.name = "ContentError";
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class ContentNotFoundError extends ContentError {
  constructor(message = "Content not found.", cause?: unknown) {
    super(message, "not_found", cause);
    this.name = "ContentNotFoundError";
  }
}

export class ContentTenantMismatchError extends ContentError {
  constructor(message = "Content reference tenant does not match adapter tenant.", cause?: unknown) {
    super(message, "tenant_mismatch", cause);
    this.name = "ContentTenantMismatchError";
  }
}

export class ContentUnsupportedTypeError extends ContentError {
  constructor(message = "Content type is not supported by this adapter.", cause?: unknown) {
    super(message, "unsupported_type", cause);
    this.name = "ContentUnsupportedTypeError";
  }
}

export class ContentInvalidRefError extends ContentError {
  constructor(message = "Content reference is invalid.", cause?: unknown) {
    super(message, "invalid_ref", cause);
    this.name = "ContentInvalidRefError";
  }
}

export class ContentConfigurationError extends ContentError {
  constructor(message = "Content provider is not configured.", cause?: unknown) {
    super(message, "configuration", cause);
    this.name = "ContentConfigurationError";
  }
}

export function isContentError(value: unknown): value is ContentError {
  return value instanceof ContentError;
}
