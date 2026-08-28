import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { canReadPlatformPublishingJob } from "@/lib/platform/http/platform-job-access";
import { toAdminPlatformJobPollView } from "@/lib/platform/http/job-poll-view";
import { findPlatformJobById } from "@/lib/platform/jobs/repository";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

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

  const context = await resolveStudioOpsContext(req);
  if (!context) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await ctx.params;
  const id = jobId.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing job id." }, { status: 400 });
  }

  const record = await findPlatformJobById(id);
  if (!record || !canReadPlatformPublishingJob(context, record)) {
    return NextResponse.json({ ok: false, error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    job: toAdminPlatformJobPollView(record),
  });
}
