import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { findPlatformJobById } from "@/lib/platform/jobs/repository";
import { readPublishingJobResult } from "@/lib/platform/jobs/publishing-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ jobId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isPlatformFeatureEnabled("jobs")) {
    return NextResponse.json({ ok: false, error: "Platform jobs disabled." }, { status: 503 });
  }

  const { jobId } = await ctx.params;
  const id = jobId.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing job id." }, { status: 400 });
  }

  const record = await findPlatformJobById(id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Job not found." }, { status: 404 });
  }

  const result = readPublishingJobResult(record.payload);
  const sanitizedResult = result
    ? {
        ok: result.ok,
        resourceId: result.resourceId ?? null,
        error: result.error,
        hubProject: result.hubProject,
        hubBlog: result.hubBlog,
      }
    : null;

  return NextResponse.json({
    ok: true,
    job: {
      id: record.id,
      status: record.status,
      type: record.type,
      tenantSlug: record.tenantSlug,
      errorSummary: record.errorSummary,
      result: sanitizedResult,
    },
  });
}
