/**
 * Project completion queue — operational dashboard data (Phase 25).
 */

import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { contentRefKey } from "@/lib/platform/content/types";
import {
  allowedNextLifecycles,
  requiresCompletenessForReview,
} from "@/lib/platform/projects/lifecycle-transitions";
import { evaluateProjectPublishGate } from "@/lib/platform/projects/publish-gate";
import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import type { ProjectWorkflowPriority } from "@/lib/platform/projects/workflow-state";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import {
  canApproveStudioProject,
  canWriteStudioProject,
} from "@/lib/studio/access";
import {
  categorizeMissingBlockers,
  friendlyMissingList,
} from "@/lib/studio/projects/completion-blockers";
import {
  listBrightlineWorkflowProjects,
  listMirotechWorkflowProjects,
} from "@/lib/studio/projects/list-studio-projects";
import { studioProjectPreviewHref } from "@/lib/studio/projects/edit-href";
import { encodeStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import type { StudioOpsMembership } from "@/lib/studio/ops/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { loadAllStoredProjectWorkflowStates } from "@/lib/platform/projects/workflow-state";

import {
  COMPLETION_QUEUE_SECTIONS,
  type CompletionQueueSectionId,
  COMPLETION_QUEUE_SECTION_LABELS,
} from "@/lib/studio/projects/completion-queue-sections";

import type { CompletionQueueItem, CompletionQueueQuickActions } from "@/lib/studio/projects/completion-queue-types";

export type CompletionQueueResult = {
  tenantFilter: TenantSlug | "all";
  sections: Record<CompletionQueueSectionId, CompletionQueueItem[]>;
  totals: Record<CompletionQueueSectionId, number>;
  canWrite: boolean;
};

function contentRefForRow(
  tenant: TenantSlug,
  kind: "work-project" | "mirotech-case-study",
  id: string
): ContentRef {
  return kind === "work-project"
    ? { tenant: "brightline", type: "work-project", id }
    : { tenant: "mirotech", type: "mirotech-case-study", id };
}

function assignQueueSections(input: {
  lifecycle: ProjectWorkflowLifecycle;
  published: boolean;
  complete: boolean;
  blockers: ReturnType<typeof categorizeMissingBlockers>;
  publishFailedAt: string | null;
}): CompletionQueueSectionId[] {
  const sections: CompletionQueueSectionId[] = [];

  if (input.publishFailedAt) {
    sections.push("publish-failed");
  }

  if (input.published && (!input.complete || input.blockers.content.length > 0 || input.blockers.media.length > 0 || input.blockers.seo.length > 0)) {
    sections.push("published-needs-verification");
  }

  if (input.lifecycle === "APPROVED" && !input.published && !input.publishFailedAt) {
    sections.push("approved-waiting-publish");
  }

  if (
    !input.published &&
    input.complete &&
    (input.lifecycle === "MEDIA_READY" || input.lifecycle === "CONTENT_READY") &&
    input.lifecycle !== "IN_REVIEW" &&
    input.lifecycle !== "APPROVED"
  ) {
    sections.push("ready-for-review");
  }

  if (input.blockers.seo.length > 0) {
    sections.push("needs-seo");
  }
  if (input.blockers.media.length > 0) {
    sections.push("needs-media");
  }
  if (input.blockers.content.length > 0) {
    sections.push("needs-content");
  }

  return [...new Set(sections)];
}

export async function buildCompletionQueueItem(
  row: Awaited<ReturnType<typeof listBrightlineWorkflowProjects>>[number],
  stored: {
    priority?: ProjectWorkflowPriority;
    publishFailedAt?: string | null;
    publishFailedReason?: string | null;
  } | null,
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): Promise<CompletionQueueItem> {
  const ref = contentRefForRow(row.tenant, row.kind, row.id);
  const blockers = categorizeMissingBlockers(row.missing);
  const publishGate = await evaluateProjectPublishGate(ref);
  const canWrite = canWriteStudioProject(row.tenant, permissions, legacyAdmin);
  const canApprove = canApproveStudioProject(row.tenant, permissions, legacyAdmin);

  const allowed = allowedNextLifecycles(row.lifecycle);
  const canSubmitReview =
    canWrite &&
    allowed.includes("IN_REVIEW") &&
    (!requiresCompletenessForReview("IN_REVIEW") || row.completenessComplete);

  const canPublish =
    canWrite &&
    (canApprove || legacyAdmin) &&
    publishGate.allowed &&
    row.lifecycle === "APPROVED";

  const projectRefParam = encodeStudioProjectRefParam(ref);
  const editHref = row.editHref;
  const mediaHref = `${editHref}?tab=media`;
  const previewHref = studioProjectPreviewHref(row.tenant, row.kind, row.id);

  const publishFailedAt = stored?.publishFailedAt ?? null;

  const queueSections = assignQueueSections({
    lifecycle: row.lifecycle,
    published: row.published,
    complete: row.completenessComplete,
    blockers,
    publishFailedAt,
  });

  return {
    id: row.id,
    tenant: row.tenant,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    lifecycle: row.lifecycle,
    lifecycleLabel: row.lifecycleLabel,
    priority: stored?.priority ?? "NORMAL",
    completenessScore: row.completenessScore,
    missing: row.missing,
    friendlyMissing: friendlyMissingList(row.missing),
    blockers,
    published: row.published,
    updatedAt: row.updatedAt,
    editHref,
    mediaHref,
    previewHref,
    projectRefParam,
    publishFailedReason: stored?.publishFailedReason ?? null,
    quickActions: {
      edit: canWrite,
      media: canWrite,
      preview: Boolean(previewHref),
      submitReview: canSubmitReview,
      publish: canPublish,
    },
    queueSections,
  };
}

function emptySections(): Record<CompletionQueueSectionId, CompletionQueueItem[]> {
  return {
    "needs-content": [],
    "needs-media": [],
    "needs-seo": [],
    "ready-for-review": [],
    "approved-waiting-publish": [],
    "publish-failed": [],
    "published-needs-verification": [],
  };
}

export async function listProjectCompletionQueue(input: {
  memberships: StudioOpsMembership[];
  permissions: PlatformPermission[];
  legacyAdmin: boolean;
  tenantFilter?: TenantSlug | "all";
}): Promise<CompletionQueueResult> {
  const storedStates = await loadAllStoredProjectWorkflowStates();
  const rows: Awaited<ReturnType<typeof listBrightlineWorkflowProjects>> = [];

  const allowedTenants: TenantSlug[] = [];
  for (const m of input.memberships) {
    if (m.tenantSlug === "brightline") allowedTenants.push("brightline");
    if (m.tenantSlug === "mirotech") allowedTenants.push("mirotech");
  }
  const uniqueAllowed = [...new Set(allowedTenants)];
  const tenantFilter =
    input.tenantFilter === "all" && uniqueAllowed.length > 1
      ? "all"
      : input.tenantFilter === "brightline" || input.tenantFilter === "mirotech"
        ? uniqueAllowed.includes(input.tenantFilter)
          ? input.tenantFilter
          : uniqueAllowed[0] ?? "brightline"
        : uniqueAllowed.length > 1
          ? "all"
          : uniqueAllowed[0] ?? "brightline";

  if (tenantFilter === "all" || tenantFilter === "brightline") {
    if (uniqueAllowed.includes("brightline")) {
      rows.push(...(await listBrightlineWorkflowProjects(storedStates)));
    }
  }
  if (tenantFilter === "all" || tenantFilter === "mirotech") {
    if (uniqueAllowed.includes("mirotech")) {
      rows.push(...(await listMirotechWorkflowProjects(storedStates)));
    }
  }

  const activeRows = rows.filter((r) => r.lifecycle !== "ARCHIVED");

  const items = await Promise.all(
    activeRows.map((row) => {
      const refKey = contentRefKey(contentRefForRow(row.tenant, row.kind, row.id));
      const stored = storedStates.get(refKey);
      return buildCompletionQueueItem(row, stored ?? null, input.permissions, input.legacyAdmin);
    })
  );

  const sections = emptySections();
  for (const item of items) {
    for (const sectionId of item.queueSections) {
      sections[sectionId].push(item);
    }
  }

  const priorityRank: Record<ProjectWorkflowPriority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };
  for (const sectionId of COMPLETION_QUEUE_SECTIONS) {
    sections[sectionId].sort((a, b) => {
      const pr = priorityRank[a.priority] - priorityRank[b.priority];
      if (pr !== 0) return pr;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  const totals = Object.fromEntries(
    COMPLETION_QUEUE_SECTIONS.map((id) => [id, sections[id].length])
  ) as Record<CompletionQueueSectionId, number>;

  const canWrite =
    input.legacyAdmin ||
    input.permissions.some((p) =>
      ["brightline.project.write", "mirotech.project.write"].includes(p)
    );

  return {
    tenantFilter,
    sections,
    totals,
    canWrite,
  };
}
