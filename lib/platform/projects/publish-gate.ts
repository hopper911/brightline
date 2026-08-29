import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { loadProjectWorkflowSnapshot } from "@/lib/platform/projects/workflow-snapshot";
import { ProjectWorkflowValidationError } from "@/lib/platform/projects/errors";
import { resolveEffectiveLifecycle } from "@/lib/platform/projects/lifecycle-transitions";
import { defaultProjectWorkflowService } from "@/lib/platform/projects/server";
import { getStoredProjectWorkflowState } from "@/lib/platform/projects/workflow-state";

export type ProjectPublishGateResult = {
  allowed: boolean;
  lifecycle: string;
  missing: string[];
  reason?: string;
};

export async function evaluateProjectPublishGate(ref: ContentRef): Promise<ProjectPublishGateResult> {
  const input = await loadProjectWorkflowSnapshot(ref);
  const completeness = defaultProjectWorkflowService.evaluateCompleteness(input);
  const derived = defaultProjectWorkflowService.deriveLifecycle(input);
  const stored = await getStoredProjectWorkflowState(ref);
  const lifecycle = resolveEffectiveLifecycle(
    stored?.lifecycle ?? null,
    derived,
    input.published
  );

  if (!completeness.complete) {
    return {
      allowed: false,
      lifecycle,
      missing: completeness.missing,
      reason: "Project completeness checks have not passed.",
    };
  }

  if (lifecycle !== "APPROVED" && lifecycle !== "PUBLISHED") {
    return {
      allowed: false,
      lifecycle,
      missing: completeness.missing,
      reason: "Project must be approved before publication.",
    };
  }

  return { allowed: true, lifecycle, missing: [] };
}

export async function assertProjectPublishAllowed(ref: ContentRef): Promise<void> {
  const gate = await evaluateProjectPublishGate(ref);
  if (!gate.allowed) {
    const detail = gate.missing.length ? ` Missing: ${gate.missing.join(", ")}.` : "";
    throw new ProjectWorkflowValidationError(`${gate.reason ?? "Publish not allowed."}${detail}`);
  }
}
