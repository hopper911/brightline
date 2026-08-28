import { jsonErr, jsonOk } from "@/lib/api/http";
import { guardCronBearer } from "@/lib/api/guards";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { drainPlatformJobs } from "@/lib/platform/jobs/drain-platform-jobs";
import { apiLog } from "@/lib/observability/log";

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
    apiLog("cron.platform-jobs", "info", "completed", result);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    apiLog("cron.platform-jobs", "error", "failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return jsonErr(err instanceof Error ? err.message : "Platform jobs cron failed.", 500);
  }
}
