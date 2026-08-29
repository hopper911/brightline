import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  allowedProjectTenants,
  canWriteStudioProject,
} from "@/lib/studio/access";
import { parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import { verifyAndStorePublishedProject } from "@/lib/platform/projects/verify-published-project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  if (
    !allowedProjectTenants(opsContext.permissions, legacyAdmin, opsContext.memberships).includes(
      ref.tenant
    )
  ) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (!canWriteStudioProject(ref.tenant, opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const result = await verifyAndStorePublishedProject(ref);
  return NextResponse.json({ ok: true, verification: result });
}
