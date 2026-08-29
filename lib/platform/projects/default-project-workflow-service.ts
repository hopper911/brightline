import "server-only";

import type { AuthorizationService } from "@/lib/platform/authorization/authorization-service";
import { defaultAuthorizationService } from "@/lib/platform/authorization/default-authorization-service";
import { PermissionDeniedError } from "@/lib/platform/authorization/errors";
import type { AuthorizationSubject } from "@/lib/platform/authorization/types";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformContext } from "@/lib/platform/context/types";
import type { ContentRef } from "@/lib/platform/content/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { createBrightlineWorkProjectDraft } from "@/lib/platform/projects/adapters/brightline-work-adapter";
import { createMirotechCaseStudyDraft } from "@/lib/platform/projects/adapters/mirotech-case-study-adapter";
import { publishApprovedProject } from "@/lib/platform/projects/project-publish-service";
import { applyDomainLifecycleForTransition } from "@/lib/platform/projects/apply-domain-lifecycle";
import {
  validateBrightlineProjectCompleteness,
  type BrightlineWorkProjectCompletenessInput,
} from "@/lib/platform/projects/completeness/brightline-work-project";
import {
  validateMirotechProjectCompleteness,
  type MirotechCaseStudyCompletenessInput,
} from "@/lib/platform/projects/completeness/mirotech-case-study";
import {
  ProjectWorkflowPermissionDeniedError,
  ProjectWorkflowTransitionError,
  ProjectWorkflowUnsupportedKindError,
  ProjectWorkflowValidationError,
} from "@/lib/platform/projects/errors";
import {
  allowedNextLifecycles,
  canTransitionLifecycle,
  isReopenReview,
  requiresApprovalPermission,
  requiresCompletenessForReview,
  resolveEffectiveLifecycle,
} from "@/lib/platform/projects/lifecycle-transitions";
import {
  mapBrightlineWorkProjectLifecycle,
  mapMirotechCaseStudyLifecycle,
} from "@/lib/platform/projects/lifecycle";
import type {
  ProjectWorkflowCompletenessInput,
  ProjectWorkflowService,
} from "@/lib/platform/projects/project-workflow-service";
import { getProjectWorkflowTemplate } from "@/lib/platform/projects/templates";
import { loadProjectWorkflowSnapshot } from "@/lib/platform/projects/workflow-snapshot";
import {
  getStoredProjectWorkflowState,
  setStoredProjectWorkflowState,
} from "@/lib/platform/projects/workflow-state";
import type {
  ProjectWorkflowCreateInput,
  ProjectWorkflowCreateResult,
  ProjectWorkflowKind,
  ProjectWorkflowLifecycle,
  ProjectWorkflowStatusChangeInput,
  ProjectWorkflowTransitionInput,
  ProjectWorkflowTransitionResult,
} from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

function approvePermissionForTenant(tenant: TenantSlug): PlatformPermission {
  if (tenant === "brightline") return "brightline.project.approve";
  return "mirotech.project.approve";
}

function filterAllowedTransitions(
  from: ProjectWorkflowLifecycle,
  completeness: { complete: boolean }
): ProjectWorkflowLifecycle[] {
  return allowedNextLifecycles(from).filter((to) => {
    if (requiresCompletenessForReview(to) && !completeness.complete) return false;
    return true;
  });
}

function createPermissionForKind(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  action: "create" | "write"
): PlatformPermission {
  if (tenant === "brightline" && kind === "work-project") {
    return action === "create" ? "brightline.project.create" : "brightline.project.write";
  }
  if (tenant === "mirotech" && kind === "mirotech-case-study") {
    return "mirotech.project.write";
  }
  throw new ProjectWorkflowUnsupportedKindError(kind, tenant);
}

function assertTenantKind(input: ProjectWorkflowCreateInput): void {
  if (input.tenant === "brightline" && input.kind !== "work-project") {
    throw new ProjectWorkflowUnsupportedKindError(input.kind, input.tenant);
  }
  if (input.tenant === "mirotech" && input.kind !== "mirotech-case-study") {
    throw new ProjectWorkflowUnsupportedKindError(input.kind, input.tenant);
  }
}

function toContentRef(tenant: TenantSlug, kind: ProjectWorkflowKind, id: string): ContentRef {
  if (kind === "work-project") {
    return { tenant: "brightline", type: "work-project", id };
  }
  return { tenant: "mirotech", type: "mirotech-case-study", id };
}

export class DefaultProjectWorkflowService implements ProjectWorkflowService {
  constructor(
    private readonly authorization: AuthorizationService = defaultAuthorizationService
  ) {}

  private async assertPermission(
    subject: AuthorizationSubject,
    tenant: TenantSlug,
    permission: PlatformPermission
  ): Promise<void> {
    if (!isPlatformFeatureEnabled("identity")) {
      if (subject.kind !== "legacy_admin") {
        throw new ProjectWorkflowPermissionDeniedError();
      }
      return;
    }

    try {
      const allowed = await this.authorization.can({ subject, tenant, permission });
      if (!allowed) {
        throw new ProjectWorkflowPermissionDeniedError();
      }
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        throw new ProjectWorkflowPermissionDeniedError(err.message);
      }
      throw err;
    }
  }

  async create(
    context: PlatformContext,
    subject: AuthorizationSubject,
    input: ProjectWorkflowCreateInput
  ): Promise<ProjectWorkflowCreateResult> {
    if (context.tenant.slug !== input.tenant) {
      throw new ProjectWorkflowValidationError(
        `Platform context tenant "${context.tenant.slug}" does not match input tenant "${input.tenant}".`
      );
    }

    assertTenantKind(input);
    const permission = createPermissionForKind(input.tenant, input.kind, "create");
    await this.assertPermission(subject, input.tenant, permission);

    const template = input.templateId
      ? getProjectWorkflowTemplate(input.tenant, input.templateId)
      : null;
    if (input.templateId && !template) {
      throw new ProjectWorkflowValidationError(`Unknown template "${input.templateId}".`);
    }

    const templateDefaults = template?.defaults ?? {};

    if (input.kind === "work-project") {
      const row = await createBrightlineWorkProjectDraft(input, templateDefaults);
      const completenessInput: BrightlineWorkProjectCompletenessInput = {
        title: row.title,
        slug: row.slug,
        section: row.section,
        summary: row.summary,
        description: row.description,
        heroMediaId: row.heroMediaId,
        mediaCount: row.mediaCount,
        seoTitle: row.seoTitle,
        metaDescription: row.metaDescription,
      };
      const completeness = validateBrightlineProjectCompleteness(completenessInput);
      const lifecycle = mapBrightlineWorkProjectLifecycle({
        published: row.published,
        summary: row.summary,
        description: row.description,
        heroMediaId: row.heroMediaId,
        mediaCount: row.mediaCount,
        completeForPublish: completeness.complete,
      });
      const ref = toContentRef("brightline", "work-project", row.id);

      await recordAuditSafely({
        context,
        actor: auditActorFromSubject(subject),
        action: "project.created",
        resource: { type: "work-project", id: row.id },
        metadata: {
          slug: row.slug,
          templateId: input.templateId ?? null,
          section: row.section,
        },
      });

      await setStoredProjectWorkflowState(ref, {
        lifecycle: "DRAFT",
        reviewNotes: null,
        updatedAt: new Date().toISOString(),
      });

      return { ref, id: row.id, slug: row.slug, lifecycle, completeness };
    }

    const row = await createMirotechCaseStudyDraft(input, templateDefaults);
    const completenessInput: MirotechCaseStudyCompletenessInput = {
      title: row.title,
      slug: row.slug,
      summary: row.summary,
      status: row.status,
      heroImage: row.heroImage,
      thumbnailImage: row.thumbnailImage,
      sectionCount: row.sectionCount,
      challenge: row.challenge,
      outcome: row.outcome,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publishMirotech: row.publishMirotech,
    };
    const completeness = validateMirotechProjectCompleteness(completenessInput);
    const lifecycle = mapMirotechCaseStudyLifecycle({
      status: row.status,
      publishedAt: null,
      heroImage: row.heroImage,
      summary: row.summary,
      sectionCount: row.sectionCount,
      completeForPublish: completeness.complete,
    });
    const ref = toContentRef("mirotech", "mirotech-case-study", row.id);

    await recordAuditSafely({
      context,
      actor: auditActorFromSubject(subject),
      action: "project.created",
      resource: { type: "mirotech-case-study", id: row.id },
      metadata: {
        slug: row.slug,
        templateId: input.templateId ?? null,
      },
    });

    await setStoredProjectWorkflowState(ref, {
      lifecycle: "DRAFT",
      reviewNotes: null,
      updatedAt: new Date().toISOString(),
    });

    return { ref, id: row.id, slug: row.slug, lifecycle, completeness };
  }

  evaluateCompleteness(input: ProjectWorkflowCompletenessInput) {
    if (input.kind === "work-project") {
      return validateBrightlineProjectCompleteness(
        input.snapshot as BrightlineWorkProjectCompletenessInput
      );
    }
    if (input.kind === "mirotech-case-study") {
      return validateMirotechProjectCompleteness(
        input.snapshot as MirotechCaseStudyCompletenessInput
      );
    }
    throw new ProjectWorkflowUnsupportedKindError(input.kind, input.tenant);
  }

  deriveLifecycle(input: ProjectWorkflowCompletenessInput): ProjectWorkflowLifecycle {
    const completeness = this.evaluateCompleteness(input);
    if (input.kind === "work-project") {
      const snap = input.snapshot as BrightlineWorkProjectCompletenessInput & { published?: boolean };
      return mapBrightlineWorkProjectLifecycle({
        published: Boolean(snap.published),
        summary: snap.summary,
        description: snap.description ?? null,
        heroMediaId: snap.heroMediaId,
        mediaCount: snap.mediaCount,
        completeForPublish: completeness.complete,
      });
    }
    const snap = input.snapshot as MirotechCaseStudyCompletenessInput;
    return mapMirotechCaseStudyLifecycle({
      status: snap.status,
      publishedAt: null,
      heroImage: snap.heroImage,
      summary: snap.summary,
      sectionCount: snap.sectionCount,
      completeForPublish: completeness.complete,
    });
  }

  async recordStatusChange(
    context: PlatformContext,
    subject: AuthorizationSubject,
    input: ProjectWorkflowStatusChangeInput
  ): Promise<void> {
    if (context.tenant.slug !== input.tenant) {
      throw new ProjectWorkflowValidationError("Tenant mismatch for status change.");
    }
    const kind = input.ref.type as ProjectWorkflowKind;
    if (!isProjectWorkflowKindForRef(input.ref)) {
      throw new ProjectWorkflowUnsupportedKindError(input.ref.type, input.tenant);
    }

    const permission = createPermissionForKind(input.tenant, kind, "write");
    await this.assertPermission(subject, input.tenant, permission);

    if (input.fromLifecycle === input.toLifecycle) return;

    await recordAuditSafely({
      context,
      actor: auditActorFromSubject(subject),
      action: "project.status.changed",
      resource: { type: input.ref.type, id: input.ref.id },
      metadata: {
        from: input.fromLifecycle,
        to: input.toLifecycle,
        reason: input.reason ?? null,
      },
    });
  }

  async transitionLifecycle(
    context: PlatformContext,
    subject: AuthorizationSubject,
    input: ProjectWorkflowTransitionInput
  ): Promise<ProjectWorkflowTransitionResult> {
    if (context.tenant.slug !== input.tenant) {
      throw new ProjectWorkflowValidationError("Tenant mismatch for lifecycle transition.");
    }
    const kind = input.ref.type as ProjectWorkflowKind;
    if (!isProjectWorkflowKindForRef(input.ref)) {
      throw new ProjectWorkflowUnsupportedKindError(input.ref.type, input.tenant);
    }

    const snapshotCtx = await loadProjectWorkflowSnapshot(input.ref);
    const completeness = this.evaluateCompleteness(snapshotCtx);
    const derived = this.deriveLifecycle(snapshotCtx);
    const stored = await getStoredProjectWorkflowState(input.ref);
    const fromLifecycle = resolveEffectiveLifecycle(
      stored?.lifecycle ?? null,
      derived,
      snapshotCtx.published
    );
    const toLifecycle = input.toLifecycle;

    if (fromLifecycle === toLifecycle) {
      return {
        lifecycle: fromLifecycle,
        completeness,
        reviewNotes: stored?.reviewNotes ?? null,
        allowedTransitions: filterAllowedTransitions(fromLifecycle, completeness),
      };
    }

    if (!canTransitionLifecycle(fromLifecycle, toLifecycle)) {
      throw new ProjectWorkflowTransitionError(
        `Cannot transition from ${fromLifecycle} to ${toLifecycle}.`
      );
    }

    if (requiresCompletenessForReview(toLifecycle) && !completeness.complete) {
      throw new ProjectWorkflowTransitionError(
        "Project is not complete enough for review.",
        completeness.missing
      );
    }

    if (toLifecycle === "PUBLISHED") {
      if (!completeness.complete) {
        throw new ProjectWorkflowTransitionError(
          "Project is not complete enough to publish.",
          completeness.missing
        );
      }
      if (fromLifecycle !== "APPROVED" && fromLifecycle !== "PUBLISHED") {
        throw new ProjectWorkflowTransitionError("Project must be approved before publication.");
      }
    }

    if (toLifecycle === "PUBLISHED") {
      const writePermission = createPermissionForKind(input.tenant, kind, "write");
      await this.assertPermission(subject, input.tenant, writePermission);
      await this.assertPermission(subject, input.tenant, approvePermissionForTenant(input.tenant));

      const publishOutcome = await publishApprovedProject(context, subject, input.ref);
      if (!publishOutcome.ok) {
        throw new ProjectWorkflowTransitionError(
          publishOutcome.error ?? "Project publish failed.",
          publishOutcome.missing ?? []
        );
      }

      const reviewNotes =
        input.reviewNotes !== undefined
          ? input.reviewNotes.trim() || null
          : stored?.reviewNotes ?? null;

      return {
        lifecycle: publishOutcome.lifecycle,
        completeness,
        reviewNotes,
        allowedTransitions: filterAllowedTransitions(publishOutcome.lifecycle, completeness),
        jobId: publishOutcome.jobId,
        publicPath: publishOutcome.publicPath,
        publishPending: publishOutcome.async,
      };
    }

    const writePermission = createPermissionForKind(input.tenant, kind, "write");
    await this.assertPermission(subject, input.tenant, writePermission);

    if (requiresApprovalPermission(toLifecycle)) {
      await this.assertPermission(subject, input.tenant, approvePermissionForTenant(input.tenant));
    }

    const reviewNotes =
      input.reviewNotes !== undefined
        ? input.reviewNotes.trim() || null
        : stored?.reviewNotes ?? null;

    await applyDomainLifecycleForTransition(input.ref, fromLifecycle, toLifecycle);

    const updatedAt = new Date().toISOString();
    await setStoredProjectWorkflowState(input.ref, {
      lifecycle: toLifecycle,
      reviewNotes,
      updatedAt,
    });

    const actor = auditActorFromSubject(subject);
    if (toLifecycle === "IN_REVIEW" && isReopenReview(fromLifecycle, toLifecycle)) {
      await recordAuditSafely({
        context,
        actor,
        action: "project.review_reopened",
        resource: { type: input.ref.type, id: input.ref.id },
        metadata: { from: fromLifecycle, reviewNotes },
      });
    } else if (toLifecycle === "IN_REVIEW") {
      await recordAuditSafely({
        context,
        actor,
        action: "project.review_requested",
        resource: { type: input.ref.type, id: input.ref.id },
        metadata: { from: fromLifecycle, reviewNotes },
      });
    } else if (toLifecycle === "APPROVED") {
      await recordAuditSafely({
        context,
        actor,
        action: "project.approved",
        resource: { type: input.ref.type, id: input.ref.id },
        metadata: { from: fromLifecycle, reviewNotes },
      });
    } else {
      await recordAuditSafely({
        context,
        actor,
        action: "project.status.changed",
        resource: { type: input.ref.type, id: input.ref.id },
        metadata: { from: fromLifecycle, to: toLifecycle },
      });
    }

    return {
      lifecycle: toLifecycle,
      completeness,
      reviewNotes,
      allowedTransitions: filterAllowedTransitions(toLifecycle, completeness),
    };
  }
}

function isProjectWorkflowKindForRef(ref: ContentRef): ref is ContentRef & { type: ProjectWorkflowKind } {
  return ref.type === "work-project" || ref.type === "mirotech-case-study";
}

function auditActorFromSubject(subject: AuthorizationSubject) {
  if (subject.kind === "user") {
    return { type: "USER" as const, id: subject.userId };
  }
  if (subject.kind === "agent") {
    return { type: "AGENT" as const, id: subject.agentId };
  }
  return { type: "USER" as const, id: "legacy_admin" };
}

export const defaultProjectWorkflowService = new DefaultProjectWorkflowService();
