import "server-only";

import { listHubProjects, type HubProject } from "@/lib/dual-brand/studio-hub";
import { defaultProjectWorkflowService } from "@/lib/platform/projects/server";
import { resolveEffectiveLifecycle } from "@/lib/platform/projects/lifecycle-transitions";
import {
  loadAllStoredProjectWorkflowStates,
  storedWorkflowStateForRef,
} from "@/lib/platform/projects/workflow-state";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import {
  canCreateBrightlineProject,
  canCreateMirotechCaseStudy,
  canReadBrightlineStudioProjects,
  canReadMirotechStudioProjects,
} from "@/lib/studio/access";
import { studioProjectEditHref } from "@/lib/studio/projects/edit-href";
import {
  lifecycleDisplayLabel,
  matchesStudioProjectStatusFilter,
  studioProjectEmptyMessage,
} from "@/lib/studio/projects/status-filters";
import type {
  StudioProjectDashboardRow,
  StudioProjectStatusFilter,
  StudioProjectsListResult,
} from "@/lib/studio/projects/types";
import type { StudioOpsMembership } from "@/lib/studio/ops/types";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type ListStudioProjectsInput = {
  memberships: StudioOpsMembership[];
  permissions: PlatformPermission[];
  legacyAdmin: boolean;
  tenantFilter?: TenantSlug | "all";
  statusFilter?: StudioProjectStatusFilter;
  page?: number;
  pageSize?: number;
};

function parsePage(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

function parsePageSize(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

function allowedReadTenants(
  permissions: PlatformPermission[],
  legacyAdmin: boolean,
  memberships: StudioOpsMembership[]
): TenantSlug[] {
  const tenants: TenantSlug[] = [];
  for (const m of memberships) {
    if (m.tenantSlug === "brightline" && canReadBrightlineStudioProjects(permissions, legacyAdmin)) {
      tenants.push("brightline");
    }
    if (m.tenantSlug === "mirotech" && canReadMirotechStudioProjects(permissions, legacyAdmin)) {
      tenants.push("mirotech");
    }
  }
  return [...new Set(tenants)];
}

function resolveTenantFilter(
  requested: TenantSlug | "all" | undefined,
  allowed: TenantSlug[]
): TenantSlug | "all" {
  if (!allowed.length) return "brightline";
  if (requested === "all" && allowed.length > 1) return "all";
  if (requested === "brightline" || requested === "mirotech") {
    return allowed.includes(requested) ? requested : allowed[0];
  }
  return allowed.length > 1 ? "all" : allowed[0];
}

export async function listBrightlineWorkflowProjects(
  storedStates: Map<string, import("@/lib/platform/projects/workflow-state").StoredProjectWorkflowState>
): Promise<StudioProjectDashboardRow[]> {
  const projects = await prisma.workProject.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      section: true,
      summary: true,
      description: true,
      published: true,
      heroMediaId: true,
      seoTitle: true,
      metaDescription: true,
      updatedAt: true,
      _count: { select: { media: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((row) => {
    const snapshot = {
      title: row.title,
      slug: row.slug,
      section: row.section,
      summary: row.summary,
      description: row.description,
      heroMediaId: row.heroMediaId,
      mediaCount: row._count.media,
      seoTitle: row.seoTitle,
      metaDescription: row.metaDescription,
      heroKeyFull: null,
      published: row.published,
    };
    const completeness = defaultProjectWorkflowService.evaluateCompleteness({
      tenant: "brightline",
      kind: "work-project",
      snapshot,
    });
    const lifecycle = defaultProjectWorkflowService.deriveLifecycle({
      tenant: "brightline",
      kind: "work-project",
      snapshot,
    });
    const stored = storedWorkflowStateForRef(
      { tenant: "brightline", type: "work-project", id: row.id },
      storedStates
    );
    const effectiveLifecycle = resolveEffectiveLifecycle(
      stored?.lifecycle ?? null,
      lifecycle,
      row.published
    );

    return {
      id: row.id,
      tenant: "brightline",
      kind: "work-project",
      title: row.title,
      slug: row.slug,
      typeLabel: `Work · ${row.section}`,
      lifecycle: effectiveLifecycle,
      lifecycleLabel: lifecycleDisplayLabel(effectiveLifecycle),
      completenessScore: completeness.score,
      completenessComplete: completeness.complete,
      missing: completeness.missing,
      published: row.published,
      updatedAt: row.updatedAt.toISOString(),
      editHref: studioProjectEditHref("brightline", "work-project", row.id),
    };
  });
}

function hubProjectToDashboardRow(
  project: HubProject,
  storedStates: Map<string, import("@/lib/platform/projects/workflow-state").StoredProjectWorkflowState>
): StudioProjectDashboardRow {
  const snapshot = {
    title: project.title,
    slug: project.slug,
    summary: project.summary ?? "",
    status: project.status ?? "DRAFT",
    heroImage: project.heroImage ?? null,
    thumbnailImage: project.thumbnailImage ?? null,
    sectionCount: project.sections?.length ?? 0,
    challenge: project.challenge ?? null,
    outcome: project.outcome ?? null,
    seoTitle: project.seoTitle ?? null,
    seoDescription: project.seoDescription ?? null,
    publishMirotech: project.publishMirotech ?? false,
  };
  const completeness = defaultProjectWorkflowService.evaluateCompleteness({
    tenant: "mirotech",
    kind: "mirotech-case-study",
    snapshot,
  });
  const lifecycle = defaultProjectWorkflowService.deriveLifecycle({
    tenant: "mirotech",
    kind: "mirotech-case-study",
    snapshot,
  });
  const published = String(project.status).toUpperCase() === "PUBLISHED";
  const stored = storedWorkflowStateForRef(
    { tenant: "mirotech", type: "mirotech-case-study", id: project.id },
    storedStates
  );
  const effectiveLifecycle = resolveEffectiveLifecycle(
    stored?.lifecycle ?? null,
    lifecycle,
    published
  );
  const updatedAt = project.updatedAt
    ? new Date(project.updatedAt).toISOString()
    : new Date().toISOString();

  return {
    id: project.id,
    tenant: "mirotech",
    kind: "mirotech-case-study",
    title: project.title,
    slug: project.slug,
    typeLabel: "Case study",
    lifecycle: effectiveLifecycle,
    lifecycleLabel: lifecycleDisplayLabel(effectiveLifecycle),
    completenessScore: completeness.score,
    completenessComplete: completeness.complete,
    missing: completeness.missing,
    published,
    updatedAt,
    editHref: studioProjectEditHref("mirotech", "mirotech-case-study", project.id),
  };
}

export async function listMirotechWorkflowProjects(
  storedStates: Map<string, import("@/lib/platform/projects/workflow-state").StoredProjectWorkflowState>
): Promise<StudioProjectDashboardRow[]> {
  const projects = await listHubProjects();
  return projects.map((project) => hubProjectToDashboardRow(project, storedStates));
}

export async function listStudioProjects(
  input: ListStudioProjectsInput
): Promise<StudioProjectsListResult> {
  const page = parsePage(input.page);
  const pageSize = parsePageSize(input.pageSize);
  const statusFilter = input.statusFilter ?? "all";
  const allowedTenants = allowedReadTenants(
    input.permissions,
    input.legacyAdmin,
    input.memberships
  );
  const tenantFilter = resolveTenantFilter(input.tenantFilter, allowedTenants);
  const storedStates = await loadAllStoredProjectWorkflowStates();

  const rows: StudioProjectDashboardRow[] = [];

  if (tenantFilter === "all" || tenantFilter === "brightline") {
    if (allowedTenants.includes("brightline")) {
      rows.push(...(await listBrightlineWorkflowProjects(storedStates)));
    }
  }
  if (tenantFilter === "all" || tenantFilter === "mirotech") {
    if (allowedTenants.includes("mirotech")) {
      rows.push(...(await listMirotechWorkflowProjects(storedStates)));
    }
  }

  const filtered = rows
    .filter((row) => matchesStudioProjectStatusFilter(row.lifecycle, statusFilter))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    tenantFilter,
    statusFilter,
    emptyMessage: studioProjectEmptyMessage(statusFilter, tenantFilter),
    canCreateBrightline: canCreateBrightlineProject(input.permissions, input.legacyAdmin),
    canCreateMirotech: canCreateMirotechCaseStudy(input.permissions, input.legacyAdmin),
  };
}

/** Parse URL search params for dashboard filters. */
export function parseStudioProjectsQuery(searchParams: URLSearchParams): {
  tenant?: TenantSlug | "all";
  status?: StudioProjectStatusFilter;
  page?: number;
} {
  const tenantRaw = searchParams.get("tenant")?.trim().toLowerCase();
  const tenant =
    tenantRaw === "all" || tenantRaw === "brightline" || tenantRaw === "mirotech"
      ? tenantRaw
      : undefined;

  const statusRaw = searchParams.get("status")?.trim().toLowerCase();
  const status = (
    [
      "all",
      "draft",
      "needs-content",
      "needs-media",
      "review",
      "approved",
      "published",
    ] as const
  ).includes(statusRaw as StudioProjectStatusFilter)
    ? (statusRaw as StudioProjectStatusFilter)
    : undefined;

  const pageRaw = searchParams.get("page");
  const page = pageRaw ? Number(pageRaw) : undefined;

  return { tenant, status, page };
}
