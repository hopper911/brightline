import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import {
  ProjectSlugConflictError,
  ProjectWorkflowError,
  ProjectWorkflowPermissionDeniedError,
  ProjectWorkflowValidationError,
} from "@/lib/platform/projects/errors";
import { defaultProjectWorkflowService } from "@/lib/platform/projects/server";
import { isProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import {
  allowedProjectTenants,
  canCreateBrightlineProject,
  canCreateMirotechCaseStudy,
} from "@/lib/studio/access";
import { studioProjectEditHref } from "@/lib/studio/projects/edit-href";
import {
  listStudioProjects,
  parseStudioProjectsQuery,
} from "@/lib/studio/projects/list-studio-projects";
import { resolveStudioAuthorizationSubject } from "@/lib/studio/projects/resolve-subject";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTenant(value: string | undefined): TenantSlug | null {
  const v = value?.trim().toLowerCase();
  if (v === "brightline" || v === "mirotech") return v;
  return null;
}

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const context = await resolveStudioOpsContext(req);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const legacyAdmin = context.subjectKind === "legacy_admin";
  const allowed = allowedProjectTenants(context.permissions, legacyAdmin, context.memberships);
  if (!allowed.length) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const params = parseStudioProjectsQuery(new URL(req.url).searchParams);
  const result = await listStudioProjects({
    memberships: context.memberships,
    permissions: context.permissions,
    legacyAdmin,
    tenantFilter: params.tenant,
    statusFilter: params.status,
    page: params.page,
  });

  return NextResponse.json({ ok: true, ...result, allowedTenants: allowed });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  const body = (await req.json().catch(() => null)) as {
    tenant?: string;
    kind?: string;
    title?: string;
    slug?: string;
    templateId?: string;
    pillarSlug?: string;
    section?: string;
    summary?: string;
    projectBrief?: string;
    applyTemplateDraft?: boolean;
  } | null;

  const tenant = parseTenant(body?.tenant);
  if (!tenant) {
    return NextResponse.json({ ok: false, error: "tenant is required." }, { status: 400 });
  }

  if (!allowedProjectTenants(opsContext.permissions, legacyAdmin, opsContext.memberships).includes(tenant)) {
    return NextResponse.json({ ok: false, error: "Forbidden for tenant." }, { status: 403 });
  }

  if (tenant === "brightline" && !canCreateBrightlineProject(opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (tenant === "mirotech" && !canCreateMirotechCaseStudy(opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const kind = body?.kind?.trim();
  const defaultKind = tenant === "brightline" ? "work-project" : "mirotech-case-study";
  const resolvedKind = kind ?? defaultKind;
  if (!isProjectWorkflowKind(resolvedKind)) {
    return NextResponse.json({ ok: false, error: "Invalid project kind." }, { status: 400 });
  }

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "title is required." }, { status: 400 });
  }

  const platformContext = createPlatformContextForTenant(tenant);
  const subject = await resolveStudioAuthorizationSubject();

  try {
    const result = await defaultProjectWorkflowService.create(platformContext, subject, {
      tenant,
      kind: resolvedKind,
      title,
      slug: body?.slug?.trim() || undefined,
      templateId: body?.templateId?.trim() || undefined,
      pillarSlug: body?.pillarSlug?.trim() || undefined,
      section: body?.section?.trim() || undefined,
      summary: body?.summary?.trim() || undefined,
      projectBrief: body?.projectBrief?.trim() || undefined,
      applyTemplateDraft: body?.applyTemplateDraft === true,
    });

    return NextResponse.json({
      ok: true,
      project: {
        ...result,
        editHref: studioProjectEditHref(tenant, resolvedKind, result.id),
      },
    });
  } catch (error) {
    if (error instanceof ProjectWorkflowPermissionDeniedError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 403 });
    }
    if (error instanceof ProjectSlugConflictError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 409 });
    }
    if (error instanceof ProjectWorkflowValidationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    if (error instanceof ProjectWorkflowError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    console.error("STUDIO_PROJECT_CREATE_ERROR", error);
    return NextResponse.json({ ok: false, error: "Failed to create project." }, { status: 500 });
  }
}
