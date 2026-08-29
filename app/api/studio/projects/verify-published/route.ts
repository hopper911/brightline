import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  allowedProjectTenants,
  canWriteStudioProject,
} from "@/lib/studio/access";
import {
  listBrightlineWorkflowProjects,
  listMirotechWorkflowProjects,
} from "@/lib/studio/projects/list-studio-projects";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import { verifyAndStorePublishedProject } from "@/lib/platform/projects/verify-published-project";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { loadAllStoredProjectWorkflowStates } from "@/lib/platform/projects/workflow-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH = 30;

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  const allowedTenants = allowedProjectTenants(
    opsContext.permissions,
    legacyAdmin,
    opsContext.memberships
  );
  if (!allowedTenants.length) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { tenant?: TenantSlug } | null;
  const tenantFilter =
    body?.tenant === "brightline" || body?.tenant === "mirotech"
      ? allowedTenants.includes(body.tenant)
        ? body.tenant
        : allowedTenants[0]
      : undefined;

  const storedStates = await loadAllStoredProjectWorkflowStates();
  const rows: Awaited<ReturnType<typeof listBrightlineWorkflowProjects>> = [];

  if (!tenantFilter || tenantFilter === "brightline") {
    if (allowedTenants.includes("brightline") && canWriteStudioProject("brightline", opsContext.permissions, legacyAdmin)) {
      rows.push(...(await listBrightlineWorkflowProjects(storedStates)));
    }
  }
  if (!tenantFilter || tenantFilter === "mirotech") {
    if (allowedTenants.includes("mirotech") && canWriteStudioProject("mirotech", opsContext.permissions, legacyAdmin)) {
      rows.push(...(await listMirotechWorkflowProjects(storedStates)));
    }
  }

  const published = rows.filter((r) => r.published).slice(0, MAX_BATCH);
  const results = [];

  for (const row of published) {
    const ref =
      row.kind === "work-project"
        ? { tenant: "brightline" as const, type: "work-project" as const, id: row.id }
        : { tenant: "mirotech" as const, type: "mirotech-case-study" as const, id: row.id };
    const verification = await verifyAndStorePublishedProject(ref);
    results.push({
      tenant: row.tenant,
      kind: row.kind,
      id: row.id,
      title: row.title,
      verification,
    });
  }

  return NextResponse.json({
    ok: true,
    verified: results.length,
    results,
  });
}
