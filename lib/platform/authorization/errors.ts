export type AuthorizationErrorCode = "DISABLED" | "FORBIDDEN" | "INVALID_SUBJECT";

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;

  constructor(code: AuthorizationErrorCode, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

export class AuthorizationDisabledError extends AuthorizationError {
  constructor() {
    super("DISABLED", "Platform authorization is disabled (PLATFORM_IDENTITY_ENABLED=false).");
  }
}

export class PermissionDeniedError extends AuthorizationError {
  readonly permission: string;

  constructor(permission: string, tenantSlug: string) {
    super("FORBIDDEN", `Permission denied: ${permission} (tenant=${tenantSlug}).`);
    this.name = "PermissionDeniedError";
    this.permission = permission;
  }
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}
