import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { generateMirotechTemplateDraft } from "@/lib/platform/projects/mirotech-template-draft";
import {
  allowedProjectTenants,
  canCreateMirotechCaseStudy,
} from "@/lib/studio/access";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/studio/projects/draft-from-brief
 * Optional AI-assisted case study draft from template + brief. Draft only — never saves or publishes.
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
  if (!canCreateMirotechCaseStudy(opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const allowed = allowedProjectTenants(
    opsContext.permissions,
    legacyAdmin,
    opsContext.memberships
  );
  if (!allowed.includes("mirotech")) {
    return NextResponse.json({ ok: false, error: "Forbidden for tenant." }, { status: 403 });
  }

  const ip = getClientIp(req);
  if (
    await isRateLimitedAsync(ip, {
      scope: "ai-mirotech-template-draft",
      max: 30,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: "Too many AI draft requests. Try again shortly." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    templateId?: string;
    title?: string;
    brief?: string;
  } | null;

  const templateId = body?.templateId?.trim();
  const title = body?.title?.trim();
  const brief = body?.brief?.trim();

  if (!templateId) {
    return NextResponse.json({ ok: false, error: "templateId is required." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, error: "title is required." }, { status: 400 });
  }
  if (!brief) {
    return NextResponse.json({ ok: false, error: "brief is required." }, { status: 400 });
  }

  const result = await generateMirotechTemplateDraft({ templateId, title, brief });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, code: result.code },
      { status: result.status ?? 500 }
    );
  }

  return NextResponse.json(result);
}
