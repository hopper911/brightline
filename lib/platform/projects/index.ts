export type {
  ProjectCompletenessResult,
  ProjectSlugConflictPolicy,
  ProjectWorkflowCreateInput,
  ProjectWorkflowCreateResult,
  ProjectWorkflowKind,
  ProjectWorkflowLifecycle,
  ProjectWorkflowStatusChangeInput,
} from "@/lib/platform/projects/types";
export {
  PROJECT_WORKFLOW_KINDS,
  PROJECT_WORKFLOW_LIFECYCLE,
  isProjectWorkflowKind,
} from "@/lib/platform/projects/types";
export {
  ProjectSlugConflictError,
  ProjectWorkflowError,
  ProjectWorkflowPermissionDeniedError,
  ProjectWorkflowUnsupportedKindError,
  ProjectWorkflowValidationError,
} from "@/lib/platform/projects/errors";
export {
  validateBrightlineProjectCompleteness,
} from "@/lib/platform/projects/completeness/brightline-work-project";
export {
  validateMirotechProjectCompleteness,
} from "@/lib/platform/projects/completeness/mirotech-case-study";
export {
  PROJECT_WORKFLOW_TEMPLATES,
  getProjectWorkflowTemplate,
  listProjectWorkflowTemplates,
} from "@/lib/platform/projects/templates";
export type { ProjectWorkflowService } from "@/lib/platform/projects/project-workflow-service";
