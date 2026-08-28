import { jsonErr, jsonOk } from "@/lib/api/http";
import { guardCronBearer } from "@/lib/api/guards";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { drainPlatformJobs } from "@/lib/platform/jobs/drain-platform-jobs";
import { platformLog } from "@/lib/observability/platform-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_JOBS = 20;

export async function GET(req: Request) {
  const denied = guardCronBearer(req);
  if (denied) return denied;

  if (!isPlatformFeatureEnabled("jobs")) {
    return jsonOk({ ok: true, skipped: true, reason: "jobs_disabled" });
  }

  try {
    const url = new URL(req.url);
    const maxJobs = Math.min(
      Math.max(Number.parseInt(url.searchParams.get("maxJobs") ?? "", 10) || DEFAULT_MAX_JOBS, 1),
      50
    );
    const result = await drainPlatformJobs({ maxJobs });
    platformLog({
      severity: "info",
      service: "platform",
      action: "cron.platform-jobs",
      message: "completed",
      meta: result,
    });
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    platformLog({
      severity: "error",
      service: "platform",
      action: "cron.platform-jobs",
      message: "failed",
      meta: {
        message: err instanceof Error ? err.message : "unknown",
      },
    });
    return jsonErr(err instanceof Error ? err.message : "Platform jobs cron failed.", 500);
  }
}
