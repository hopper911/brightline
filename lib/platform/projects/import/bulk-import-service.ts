/**
 * Controlled bulk project import — dry run and execute (Phase 24).
 */

import "server-only";

import type { AuthorizationSubject } from "@/lib/platform/authorization/types";
import type { PlatformContext } from "@/lib/platform/context/types";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import { createBrightlineWorkProjectDraft } from "@/lib/platform/projects/adapters/brightline-work-adapter";
import { createMirotechCaseStudyDraft } from "@/lib/platform/projects/adapters/mirotech-case-study-adapter";
import { getProjectWorkflowTemplate } from "@/lib/platform/projects/templates";
import { registerProjectImportKey } from "@/lib/platform/projects/import/import-key-registry";
import type { ContentRef } from "@/lib/platform/content/types";
import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type {
  BrightlineProjectImportRecord,
  MirotechProjectImportRecord,
  ProjectImportReport,
  ProjectImportRequest,
  ProjectImportRowResult,
} from "@/lib/platform/projects/import/types";
import {
  normalizeImportRecord,
  validateImportRow,
} from "@/lib/platform/projects/import/validate-import-row";
import { setStoredProjectWorkflowState } from "@/lib/platform/projects/workflow-state";
import { mirotechUpdateHubProject } from "@/lib/platform/publishing/mirotech/hub-remote-write";
import { prisma } from "@/lib/prisma";
import type { TenantSlug } from "@/lib/platform/tenants/types";

function toContentRef(tenant: TenantSlug, kind: ProjectWorkflowKind, id: string): ContentRef {
  if (kind === "work-project") {
    return { tenant: "brightline", type: "work-project", id };
  }
  return { tenant: "mirotech", type: "mirotech-case-study", id };
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

function rowResultFromValidation(
  validated: Awaited<ReturnType<typeof validateImportRow>>,
  status: ProjectImportRowResult["status"],
  extra?: Partial<ProjectImportRowResult>
): ProjectImportRowResult {
  return {
    index: validated.index,
    importKey: validated.importKey,
    title: validated.title,
    status,
    slug: validated.slugCandidate ?? undefined,
    errors: validated.errors,
    warnings: validated.warnings,
    ...extra,
  };
}

export async function runProjectBulkImport(
  context: PlatformContext,
  subject: AuthorizationSubject,
  request: ProjectImportRequest
): Promise<ProjectImportReport> {
  const { tenant, kind, dryRun, records } = request;
  const rows: ProjectImportRowResult[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let skippedCount = 0;
  let createdCount = 0;
  let warningCount = 0;

  for (let index = 0; index < records.length; index++) {
    const normalized = normalizeImportRecord(tenant, kind, records[index]);
    if (!normalized) {
      invalidCount += 1;
      rows.push({
        index,
        importKey: null,
        title: "",
        status: "invalid",
        errors: ["Record is not a valid object or missing required fields (title, pillarSlug for Brightline)."],
        warnings: [],
      });
      continue;
    }

    const validated = await validateImportRow(tenant, kind, index, normalized);

    if (validated.skipReason) {
      skippedCount += 1;
      rows.push(
        rowResultFromValidation(validated, "skipped", { warnings: [validated.skipReason] })
      );
      continue;
    }

    if (!validated.valid) {
      invalidCount += 1;
      warningCount += validated.warnings.length;
      rows.push(rowResultFromValidation(validated, "invalid"));
      continue;
    }

    validCount += 1;
    warningCount += validated.warnings.length;

    if (dryRun) {
      rows.push(
        rowResultFromValidation(validated, "valid", {
          warnings: [
            ...validated.warnings,
            "Dry run — project would be created as DRAFT.",
          ],
        })
      );
      continue;
    }

    try {
      const created = await importSingleRecord(context, subject, tenant, kind, validated);
      createdCount += 1;
      rows.push(
        rowResultFromValidation(validated, "valid", {
          projectId: created.id,
          slug: created.slug,
          warnings: validated.warnings,
        })
      );
    } catch (err: unknown) {
      invalidCount += 1;
      validCount -= 1;
      const message = err instanceof Error ? err.message : "Import create failed.";
      rows.push(
        rowResultFromValidation(validated, "invalid", {
          errors: [...validated.errors, message],
        })
      );
    }
  }

  return {
    ok: true,
    dryRun,
    tenant,
    kind,
    summary: {
      total: records.length,
      valid: validCount,
      invalid: invalidCount,
      skipped: skippedCount,
      created: dryRun ? 0 : createdCount,
      warnings: warningCount,
    },
    rows,
  };
}

async function importSingleRecord(
  context: PlatformContext,
  subject: AuthorizationSubject,
  tenant: ProjectImportRequest["tenant"],
  kind: ProjectImportRequest["kind"],
  validated: Awaited<ReturnType<typeof validateImportRow>>
): Promise<{ id: string; slug: string }> {
  const record = validated.record;

  if (kind === "work-project" && tenant === "brightline") {
    const bl = record as BrightlineProjectImportRecord;
    const row = await createBrightlineWorkProjectDraft({
      tenant: "brightline",
      kind: "work-project",
      title: bl.title,
      slug: bl.slug,
      pillarSlug: bl.pillarSlug,
      summary: bl.summary,
      slugConflictPolicy: "reject",
    });

    await prisma.workProject.update({
      where: { id: row.id },
      data: {
        description: bl.description?.trim() || undefined,
        context: bl.problem?.trim() || undefined,
        approach: bl.solution?.trim() || undefined,
        highlight: bl.results?.trim() || undefined,
        tags: bl.technologies?.length ? bl.technologies : undefined,
        seoTitle: bl.seo?.title?.trim() || undefined,
        metaDescription: bl.seo?.description?.trim() || undefined,
        heroMediaId: validated.brightlineHeroMediaId ?? undefined,
        published: false,
      },
    });

    const ref = toContentRef("brightline", "work-project", row.id);
    await setStoredProjectWorkflowState(ref, {
      lifecycle: "DRAFT",
      reviewNotes: null,
      updatedAt: new Date().toISOString(),
    });

    if (validated.importKey) {
      await registerProjectImportKey(tenant, kind, validated.importKey, ref);
    }

    await recordAuditSafely({
      context,
      actor: auditActorFromSubject(subject),
      action: "project.imported",
      resource: { type: "work-project", id: row.id },
      metadata: {
        importKey: validated.importKey,
        dryRun: false,
        source: "bulk_import",
      },
    });

    return { id: row.id, slug: row.slug };
  }

  const mt = record as MirotechProjectImportRecord;
  const template = mt.templateId
    ? getProjectWorkflowTemplate("mirotech", mt.templateId)
    : null;
  const templateDefaults = template?.defaults ?? {};

  const draftOverlay =
    mt.problem || mt.results
      ? {
          summary: mt.summary,
          challenge: mt.problem,
          outcome: mt.results,
        }
      : undefined;

  const row = await createMirotechCaseStudyDraft(
    {
      tenant: "mirotech",
      kind: "mirotech-case-study",
      title: mt.title,
      slug: mt.slug,
      summary: mt.summary,
      templateId: template?.id,
      slugConflictPolicy: "suffix",
    },
    { ...templateDefaults, projectType: mt.projectType ?? templateDefaults.projectType },
    template?.id ?? mt.templateId ?? null,
    draftOverlay
      ? {
          summary: draftOverlay.summary,
          challenge: draftOverlay.challenge,
          outcome: draftOverlay.outcome,
          sections: draftOverlay.sections,
        }
      : undefined
  );

  const hubPatch: Record<string, unknown> = {
    status: "DRAFT",
    publishMirotech: true,
  };
  if (mt.technologies?.length) hubPatch.tools = mt.technologies;
  if (mt.seo?.title?.trim()) hubPatch.seoTitle = mt.seo.title.trim();
  if (mt.seo?.description?.trim()) hubPatch.seoDescription = mt.seo.description.trim();
  if (validated.heroObjectKey) hubPatch.heroImage = validated.heroObjectKey;
  if (validated.thumbnailObjectKey) hubPatch.thumbnailImage = validated.thumbnailObjectKey;
  if (mt.problem?.trim()) hubPatch.challenge = mt.problem.trim();
  if (mt.results?.trim()) hubPatch.outcome = mt.results.trim();
  if (mt.solution?.trim()) hubPatch.subtitle = mt.solution.trim();

  await mirotechUpdateHubProject(row.id, hubPatch);

  const ref = toContentRef("mirotech", "mirotech-case-study", row.id);
  await setStoredProjectWorkflowState(ref, {
    lifecycle: "DRAFT",
    reviewNotes: null,
    updatedAt: new Date().toISOString(),
    templateId: template?.id ?? mt.templateId ?? null,
  });

  if (validated.importKey) {
    await registerProjectImportKey(tenant, kind, validated.importKey, ref);
  }

  await recordAuditSafely({
    context,
    actor: auditActorFromSubject(subject),
    action: "project.imported",
    resource: { type: "mirotech-case-study", id: row.id },
    metadata: {
      importKey: validated.importKey,
      dryRun: false,
      source: "bulk_import",
    },
  });

  return { id: row.id, slug: row.slug };
}

export function parseProjectImportRequest(body: unknown): ProjectImportRequest | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Invalid JSON body." };
  }
  const raw = body as Record<string, unknown>;
  const tenant = raw.tenant;
  const kind = raw.kind;
  if (tenant !== "brightline" && tenant !== "mirotech") {
    return { error: "tenant must be brightline or mirotech." };
  }
  if (kind !== "work-project" && kind !== "mirotech-case-study") {
    return { error: "kind must be work-project or mirotech-case-study." };
  }
  if (tenant === "brightline" && kind !== "work-project") {
    return { error: "Brightline tenant requires kind work-project." };
  }
  if (tenant === "mirotech" && kind !== "mirotech-case-study") {
    return { error: "Mirotech tenant requires kind mirotech-case-study." };
  }
  if (!Array.isArray(raw.records)) {
    return { error: "records[] is required." };
  }
  if (raw.records.length === 0) {
    return { error: "records[] must not be empty." };
  }
  if (raw.records.length > 50) {
    return { error: "Maximum 50 records per import batch." };
  }
  const dryRun = raw.dryRun === true;
  return {
    tenant,
    kind,
    dryRun,
    records: raw.records,
  };
}
