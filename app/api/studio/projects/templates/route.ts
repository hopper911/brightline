import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { listProjectWorkflowTemplates } from "@/lib/platform/projects/templates";
import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { allowedProjectTenants } from "@/lib/studio/access";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseTenant(value: string | null): TenantSlug | null {
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
  const tenant = parseTenant(new URL(req.url).searchParams.get("tenant"));
  if (!tenant || !allowed.includes(tenant)) {
    return NextResponse.json({ ok: false, error: "Forbidden or invalid tenant." }, { status: 403 });
  }

  const kindParam = new URL(req.url).searchParams.get("kind")?.trim();
  const defaultKind: ProjectWorkflowKind =
    tenant === "brightline" ? "work-project" : "mirotech-case-study";
  const kind =
    kindParam === "work-project" || kindParam === "mirotech-case-study" ? kindParam : defaultKind;

  const templates = listProjectWorkflowTemplates(tenant, kind);

  return NextResponse.json({ ok: true, tenant, kind, templates });
}
