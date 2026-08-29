/**
 * Controlled bulk project import — shared types (Phase 24).
 */

import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type ProjectImportSeoFields = {
  title?: string;
  description?: string;
};

export type MirotechProjectImportRecord = {
  importKey?: string;
  title: string;
  slug?: string;
  projectType?: string;
  summary?: string;
  problem?: string;
  solution?: string;
  results?: string;
  technologies?: string[];
  templateId?: string;
  heroAssetId?: string;
  thumbnailAssetId?: string;
  seo?: ProjectImportSeoFields;
};

export type BrightlineProjectImportRecord = {
  importKey?: string;
  title: string;
  slug?: string;
  pillarSlug: string;
  summary?: string;
  description?: string;
  problem?: string;
  solution?: string;
  results?: string;
  technologies?: string[];
  heroAssetId?: string;
  seo?: ProjectImportSeoFields;
};

export type ProjectImportRecord = MirotechProjectImportRecord | BrightlineProjectImportRecord;

export type ProjectImportRequest = {
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  dryRun: boolean;
  records: ProjectImportRecord[];
};

export type ProjectImportRecordStatus = "valid" | "invalid" | "skipped";

export type ProjectImportRowResult = {
  index: number;
  importKey: string | null;
  title: string;
  status: ProjectImportRecordStatus;
  slug?: string;
  projectId?: string;
  errors: string[];
  warnings: string[];
};

export type ProjectImportReport = {
  ok: true;
  dryRun: boolean;
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    skipped: number;
    created: number;
    warnings: number;
  };
  rows: ProjectImportRowResult[];
};
