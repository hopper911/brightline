import { jsonErr, jsonOk } from "@/lib/api/http";
import { guardCronBearer } from "@/lib/api/guards";
import { sendDueFollowUps } from "@/lib/followups";
import { platformLog } from "@/lib/observability/platform-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = guardCronBearer(req);
  if (denied) return denied;

  try {
    const result = await sendDueFollowUps();
    platformLog({
      severity: "info",
      service: "platform",
      action: "cron.followups",
      message: "completed",
      meta: {
        checked: result.checked,
        sent: result.sent,
        failed: result.failed,
      },
    });
    return jsonOk({
      checked: result.checked,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err) {
    platformLog({
      severity: "error",
      service: "platform",
      action: "cron.followups",
      message: "failed",
      meta: {
        message: err instanceof Error ? err.message : "unknown",
      },
    });
    return jsonErr(
      err instanceof Error ? err.message : "Follow-up cron failed.",
      500
    );
  }
}
