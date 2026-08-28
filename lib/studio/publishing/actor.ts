import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import type { StudioOpsContext } from "@/lib/studio/ops/types";

export function studioActorFromContext(context: StudioOpsContext): PlatformAuditActor {
  if (context.userId) {
    return { type: "USER", id: context.userId };
  }
  return { type: "SYSTEM" };
}
