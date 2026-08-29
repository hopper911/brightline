export class ProjectWorkflowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProjectWorkflowError";
    this.code = code;
  }
}

export class ProjectWorkflowPermissionDeniedError extends ProjectWorkflowError {
  constructor(message = "Permission denied for project workflow action.") {
    super("permission_denied", message);
    this.name = "ProjectWorkflowPermissionDeniedError";
  }
}

export class ProjectWorkflowValidationError extends ProjectWorkflowError {
  constructor(message: string) {
    super("validation_error", message);
    this.name = "ProjectWorkflowValidationError";
  }
}

export class ProjectSlugConflictError extends ProjectWorkflowError {
  readonly slug: string;

  constructor(slug: string, message?: string) {
    const defaultMessage = "Project slug " + JSON.stringify(slug) + " is already in use.";
    super("slug_conflict", message ?? defaultMessage);
    this.name = "ProjectSlugConflictError";
    this.slug = slug;
  }
}

export class ProjectWorkflowTransitionError extends ProjectWorkflowError {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super("transition_denied", message);
    this.name = "ProjectWorkflowTransitionError";
    this.missing = missing;
  }
}

export class ProjectWorkflowUnsupportedKindError extends ProjectWorkflowError {
  constructor(kind: string, tenant: string) {
    const message =
      "Project kind " +
      JSON.stringify(kind) +
      " is not supported for tenant " +
      JSON.stringify(tenant) +
      ".";
    super("unsupported_kind", message);
    this.name = "ProjectWorkflowUnsupportedKindError";
  }
}
