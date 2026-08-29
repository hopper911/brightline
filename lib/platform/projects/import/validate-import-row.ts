/**
 * Per-record validation for bulk project import (Phase 24).
 */

import { WORK_SECTIONS } from "@/lib/portfolioPillars";
import { getProjectWorkflowTemplate } from "@/lib/platform/projects/templates";
import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { getPillarBySlug } from "@/lib/work-pillar-settings";
import type {
  BrightlineProjectImportRecord,
  MirotechProjectImportRecord,
  ProjectImportRecord,
} from "@/lib/platform/projects/import/types";
import { resolveImportPlatformAsset, resolveBrightlineHeroMediaId } from "@/lib/platform/projects/import/resolve-import-assets";
import { findProjectImportKey } from "@/lib/platform/projects/import/import-key-registry";
import { prisma } from "@/lib/prisma";
import { defaultMirotechContentReadPort } from "@/lib/platform/content/integrations/default-mirotech-content-read";
import { normalizeProjectSlugInput } from "@/lib/platform/projects/slug";
import { getPrimaryWorkSection } from "@/lib/work-pillar-settings";

export type ValidatedImportRow = {
  index: number;
  record: ProjectImportRecord;
  importKey: string | null;
  title: string;
  slugCandidate: string | null;
  valid: boolean;
  errors: string[];
  warnings: string[];
  skipReason: string | null;
  slugConflict: boolean;
  heroObjectKey: string | null;
  thumbnailObjectKey: string | null;
  brightlineHeroMediaId: string | null;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanString(item)).filter(Boolean);
}

export function normalizeImportRecord(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  raw: unknown
): ProjectImportRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const title = cleanString(row.title);
  if (!title) return null;

  const base = {
    importKey: cleanString(row.importKey) || undefined,
    title,
    slug: cleanString(row.slug) || undefined,
    summary: cleanString(row.summary) || undefined,
    problem: cleanString(row.problem) || undefined,
    solution: cleanString(row.solution) || undefined,
    results: cleanString(row.results) || undefined,
    technologies: cleanStringArray(row.technologies),
    heroAssetId: cleanString(row.heroAssetId) || undefined,
    seo:
      row.seo && typeof row.seo === "object" && !Array.isArray(row.seo)
        ? {
            title: cleanString((row.seo as Record<string, unknown>).title) || undefined,
            description:
              cleanString((row.seo as Record<string, unknown>).description) || undefined,
          }
        : undefined,
  };

  if (kind === "work-project" && tenant === "brightline") {
    const pillarSlug = cleanString(row.pillarSlug);
    if (!pillarSlug) return null;
    return {
      ...base,
      pillarSlug,
      description: cleanString(row.description) || undefined,
    } satisfies BrightlineProjectImportRecord;
  }

  if (kind === "mirotech-case-study" && tenant === "mirotech") {
    return {
      ...base,
      projectType: cleanString(row.projectType) || undefined,
      templateId: cleanString(row.templateId) || undefined,
      thumbnailAssetId: cleanString(row.thumbnailAssetId) || undefined,
    } satisfies MirotechProjectImportRecord;
  }

  return null;
}

async function slugTakenBrightline(section: string, slug: string): Promise<boolean> {
  const existing = await prisma.workProject.findFirst({
    where: { section: section as never, slug: { equals: slug, mode: "insensitive" } },
    select: { id: true },
  });
  return Boolean(existing);
}

async function slugTakenMirotech(slug: string): Promise<boolean> {
  const existing = await defaultMirotechContentReadPort.getMirotechWorkBySlug(slug);
  return Boolean(existing);
}

export async function validateImportRow(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  index: number,
  record: ProjectImportRecord,
  options?: { skipAssetResolution?: boolean }
): Promise<ValidatedImportRow> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const importKey = record.importKey?.trim() || null;
  const title = record.title.trim();

  if (importKey) {
    const existing = await findProjectImportKey(tenant, kind, importKey);
    if (existing) {
      return {
        index,
        record,
        importKey,
        title,
        slugCandidate: null,
        valid: false,
        errors: [],
        warnings: [],
        skipReason: `importKey "${importKey}" already imported (project ${existing.ref.id}).`,
        slugConflict: false,
        heroObjectKey: null,
        thumbnailObjectKey: null,
        brightlineHeroMediaId: null,
      };
    }
  }

  let slugCandidate: string | null = null;
  let slugConflict = false;

  if (kind === "work-project" && tenant === "brightline") {
    const bl = record as BrightlineProjectImportRecord;
    const pillar = await getPillarBySlug(bl.pillarSlug.toLowerCase());
    if (!pillar) {
      errors.push(`Unknown pillarSlug "${bl.pillarSlug}".`);
    } else if (!WORK_SECTIONS.includes(getPrimaryWorkSection(pillar))) {
      errors.push(`Pillar "${bl.pillarSlug}" has no valid work section.`);
    } else if (pillar) {
      slugCandidate = normalizeProjectSlugInput(title, bl.slug);
      if (slugCandidate) {
        slugConflict = await slugTakenBrightline(getPrimaryWorkSection(pillar), slugCandidate);
        if (slugConflict) {
          errors.push(`Slug "${slugCandidate}" already exists for section ${getPrimaryWorkSection(pillar)}.`);
        }
      }
    }
    if (!bl.summary?.trim() && !bl.description?.trim()) {
      warnings.push("No summary or description — project will appear as needs content.");
    }
  }

  if (kind === "mirotech-case-study" && tenant === "mirotech") {
    const mt = record as MirotechProjectImportRecord;
    slugCandidate = normalizeProjectSlugInput(title, mt.slug);
    if (slugCandidate) {
      slugConflict = await slugTakenMirotech(slugCandidate);
      if (slugConflict) {
        warnings.push(`Slug "${slugCandidate}" already exists — hub create would suffix if imported.`);
      }
    }
    if (mt.templateId) {
      const template = getProjectWorkflowTemplate("mirotech", mt.templateId);
      if (!template) {
        errors.push(`Unknown templateId "${mt.templateId}".`);
      }
    }
    if (!mt.summary?.trim()) {
      warnings.push("No summary — project will appear as needs content.");
    }
  }

  let heroObjectKey: string | null = null;
  let thumbnailObjectKey: string | null = null;
  let brightlineHeroMediaId: string | null = null;

  if (!options?.skipAssetResolution) {
    const heroRes = await resolveImportPlatformAsset(tenant, record.heroAssetId);
    if (heroRes.error) {
      warnings.push(heroRes.error);
    } else if (heroRes.resolved) {
      heroObjectKey = heroRes.resolved.objectKey;
      if (kind === "work-project" && tenant === "brightline") {
        const mediaRes = await resolveBrightlineHeroMediaId(tenant, record.heroAssetId);
        if (mediaRes.mediaId) brightlineHeroMediaId = mediaRes.mediaId;
      }
    }

    const thumbId =
      kind === "mirotech-case-study"
        ? (record as MirotechProjectImportRecord).thumbnailAssetId
        : undefined;
    if (thumbId) {
      const thumbRes = await resolveImportPlatformAsset(tenant, thumbId);
      if (thumbRes.error) {
        warnings.push(thumbRes.error);
      } else if (thumbRes.resolved) {
        thumbnailObjectKey = thumbRes.resolved.objectKey;
      }
    }
  }

  const valid = errors.length === 0;

  return {
    index,
    record,
    importKey,
    title,
    slugCandidate,
    valid,
    errors,
    warnings,
    skipReason: null,
    slugConflict,
    heroObjectKey,
    thumbnailObjectKey,
    brightlineHeroMediaId,
  };
}
