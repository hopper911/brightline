import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import {
  parseProjectImportRequest,
  runProjectBulkImport,
} from "@/lib/platform/projects/import/bulk-import-service";
import {
  allowedProjectTenants,
  canCreateBrightlineProject,
  canCreateMirotechCaseStudy,
} from "@/lib/studio/access";
import { resolveStudioAuthorizationSubject } from "@/lib/studio/projects/resolve-subject";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/studio/projects/import
 * Controlled bulk project ingestion — dryRun required first; never auto-publishes.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseProjectImportRequest(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const allowed = allowedProjectTenants(
    opsContext.permissions,
    legacyAdmin,
    opsContext.memberships
  );
  if (!allowed.includes(parsed.tenant)) {
    return NextResponse.json({ ok: false, error: "Forbidden for tenant." }, { status: 403 });
  }

  if (parsed.tenant === "brightline" && !canCreateBrightlineProject(opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  if (parsed.tenant === "mirotech" && !canCreateMirotechCaseStudy(opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const platformContext = createPlatformContextForTenant(parsed.tenant);
  const subject = await resolveStudioAuthorizationSubject();

  const report = await runProjectBulkImport(platformContext, subject, parsed);
  return NextResponse.json(report);
}
