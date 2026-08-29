import type { PlatformContext } from "@/lib/platform/context/types";
import type { AuthorizationSubject } from "@/lib/platform/authorization/types";
import type {
  ProjectCompletenessResult,
  ProjectWorkflowCreateInput,
  ProjectWorkflowCreateResult,
  ProjectWorkflowKind,
  ProjectWorkflowLifecycle,
  ProjectWorkflowStatusChangeInput,
} from "@/lib/platform/projects/types";
import type { ContentRef } from "@/lib/platform/content/types";

export type ProjectWorkflowCompletenessInput = {
  tenant: ProjectWorkflowCreateInput["tenant"];
  kind: ProjectWorkflowKind;
  /** Domain snapshot — shape depends on kind. */
  snapshot: Record<string, unknown>;
};

export interface ProjectWorkflowService {
  create(
    context: PlatformContext,
    subject: AuthorizationSubject,
    input: ProjectWorkflowCreateInput
  ): Promise<ProjectWorkflowCreateResult>;

  evaluateCompleteness(
    input: ProjectWorkflowCompletenessInput
  ): ProjectCompletenessResult;

  deriveLifecycle(
    input: ProjectWorkflowCompletenessInput
  ): ProjectWorkflowLifecycle;

  recordStatusChange(
    context: PlatformContext,
    subject: AuthorizationSubject,
    input: ProjectWorkflowStatusChangeInput
  ): Promise<void>;
}
