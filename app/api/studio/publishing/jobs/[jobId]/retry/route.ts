import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  canRetryPublishingJob,
  canViewStudioPublishing,
} from "@/lib/studio/access";
import { studioActorFromContext } from "@/lib/studio/publishing/actor";
import { retryStudioPublishingJob } from "@/lib/studio/publishing/studio-publish-actions";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ jobId: string }> };

function parseTenant(body: unknown): TenantSlug | null {
  if (!body || typeof body !== "object") return null;
  const tenant = (body as { tenant?: unknown }).tenant;
  if (tenant === "brightline" || tenant === "mirotech") return tenant;
  return null;
}

export async function POST(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const context = await resolveStudioOpsContext(req);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const legacyAdmin = context.subjectKind === "legacy_admin";
  if (!canViewStudioPublishing(context.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const { jobId } = await ctx.params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // tenant optional — fall back to active tenant
  }

  const tenant = parseTenant(body) ?? context.activeTenant;
  if (!canRetryPublishingJob(tenant, context.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden for tenant." }, { status: 403 });
  }

  const result = await retryStudioPublishingJob({
    tenant,
    jobId,
    actor: studioActorFromContext(context),
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
  }

  return NextResponse.json(result);
}
