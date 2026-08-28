/**
 * Platform job boundary errors (Phase 7A).
 */

export type JobErrorCode =
  | "disabled"
  | "not_found"
  | "forbidden"
  | "invalid_payload"
  | "unsupported"
  | "invalid_state"
  | "execution_failed";

export class JobError extends Error {
  readonly code: JobErrorCode;

  constructor(message: string, code: JobErrorCode, cause?: unknown) {
    super(message);
    this.name = "JobError";
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class JobsDisabledError extends JobError {
  constructor(message = "Platform jobs are disabled (PLATFORM_JOBS_ENABLED).", cause?: unknown) {
    super(message, "disabled", cause);
    this.name = "JobsDisabledError";
  }
}

export class JobNotFoundError extends JobError {
  constructor(message = "Job not found.", cause?: unknown) {
    super(message, "not_found", cause);
    this.name = "JobNotFoundError";
  }
}

export class JobForbiddenError extends JobError {
  constructor(message = "Job belongs to another tenant.", cause?: unknown) {
    super(message, "forbidden", cause);
    this.name = "JobForbiddenError";
  }
}

export class JobPayloadError extends JobError {
  constructor(message = "Job payload contains forbidden values.", cause?: unknown) {
    super(message, "invalid_payload", cause);
    this.name = "JobPayloadError";
  }
}

export class JobUnsupportedError extends JobError {
  constructor(message = "No handler registered for this job type.", cause?: unknown) {
    super(message, "unsupported", cause);
    this.name = "JobUnsupportedError";
  }
}

export class JobInvalidStateError extends JobError {
  constructor(message = "Job cannot run in its current status.", cause?: unknown) {
    super(message, "invalid_state", cause);
    this.name = "JobInvalidStateError";
  }
}

export function isJobError(value: unknown): value is JobError {
  return value instanceof JobError;
}
