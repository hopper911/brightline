/**
 * Platform identity boundary errors (Phase 8A).
 */

export type IdentityErrorCode = "disabled" | "not_found" | "invalid_input";

export class IdentityError extends Error {
  readonly code: IdentityErrorCode;

  constructor(message: string, code: IdentityErrorCode, cause?: unknown) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export class IdentityDisabledError extends IdentityError {
  constructor(message = "Platform identity is disabled (PLATFORM_IDENTITY_ENABLED).", cause?: unknown) {
    super(message, "disabled", cause);
    this.name = "IdentityDisabledError";
  }
}

export class IdentityNotFoundError extends IdentityError {
  constructor(message = "Platform user not found.", cause?: unknown) {
    super(message, "not_found", cause);
    this.name = "IdentityNotFoundError";
  }
}

export function isIdentityError(value: unknown): value is IdentityError {
  return value instanceof IdentityError;
}
