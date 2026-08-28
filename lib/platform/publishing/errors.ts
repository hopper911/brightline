/**
 * Normalized publishing boundary errors (Phase 6A).
 */

import type { PublishErrorCode } from "@/lib/platform/publishing/types";

export class PublishingError extends Error {
  readonly code: PublishErrorCode;

  constructor(message: string, code: PublishErrorCode, cause?: unknown) {
    super(message);
    this.name = "PublishingError";
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class PublishingNotFoundError extends PublishingError {
  constructor(message = "Publish source content not found.", cause?: unknown) {
    super(message, "not_found", cause);
    this.name = "PublishingNotFoundError";
  }
}

export class PublishingNotConfiguredError extends PublishingError {
  constructor(message = "Publishing adapter is not configured.", cause?: unknown) {
    super(message, "not_configured", cause);
    this.name = "PublishingNotConfiguredError";
  }
}

export class PublishingUnsupportedError extends PublishingError {
  constructor(message = "Publish request is not supported by any adapter.", cause?: unknown) {
    super(message, "unsupported", cause);
    this.name = "PublishingUnsupportedError";
  }
}

export class PublishingRemoteFailedError extends PublishingError {
  constructor(message = "Remote publish target rejected the request.", cause?: unknown) {
    super(message, "remote_failed", cause);
    this.name = "PublishingRemoteFailedError";
  }
}

/** Invalid publish request for the selected target (e.g. publish without opt-in flag). */
export class PublishingValidationError extends PublishingError {
  constructor(message = "Publish request failed validation.", cause?: unknown) {
    super(message, "validation", cause);
    this.name = "PublishingValidationError";
  }
}

/** Publish target does not match adapter or source tenant pairing. */
export class PublishingTargetError extends PublishingError {
  constructor(message = "Publish target is not valid for this source.", cause?: unknown) {
    super(message, "unsupported", cause);
    this.name = "PublishingTargetError";
  }
}

/** Underlying publish execution failed after validation. */
export class PublishingExecutionError extends PublishingError {
  constructor(message = "Publish execution failed.", cause?: unknown) {
    super(message, "remote_failed", cause);
    this.name = "PublishingExecutionError";
  }
}

export function isPublishingError(value: unknown): value is PublishingError {
  return value instanceof PublishingError;
}
