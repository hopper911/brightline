import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { listStudioAuditActivity } from "@/lib/studio/activity/list-studio-activity";
import { allowedProjectTenants } from "@/lib/studio/access";
import { auditResourceTypeForProjectRef, parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ projectRef: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { projectRef } = await context.params;
  const ref = parseStudioProjectRefParam(projectRef);
  if (!ref) {
    return NextResponse.json({ ok: false, error: "Invalid project reference." }, { status: 400 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  const allowed = allowedProjectTenants(opsContext.permissions, legacyAdmin, opsContext.memberships);
  if (!allowed.includes(ref.tenant)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const activity = await listStudioAuditActivity({
    allowedTenants: allowed,
    filters: {
      tenant: ref.tenant,
      resourceType: auditResourceTypeForProjectRef(ref),
      resourceId: ref.id,
    },
  });

  const major = activity.events.filter((event) => {
    if (event.action.startsWith("project.")) return true;
    if (event.action.startsWith("publishing.")) return true;
    if (event.action === "asset.registered") return true;
    return false;
  });

  return NextResponse.json({
    ok: true,
    enabled: activity.enabled,
    events: major,
    nextCursor: activity.nextCursor,
  });
}
