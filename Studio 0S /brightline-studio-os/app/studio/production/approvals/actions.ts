"use server";

import { getPendingApprovals, approveAction, rejectAction } from "@/lib/approvals/store";
import { applyApprovalPayload } from "@/lib/approvals/apply";
import { isDemoMode } from "@/lib/runtime/demo";
import { runWithDemoMode } from "@/lib/runtime/demoContext";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";
import { DEMO_APPROVALS } from "@/lib/studio/demoData";

export type ApprovalRecord = {
  id: string;
  actionType: string;
  room: string;
  status: string;
  payloadJson: string | null;
  createdAt: string;
};

export async function fetchPendingApprovals(): Promise<ApprovalRecord[]> {
  try {
    if (await isDemoMode()) return DEMO_APPROVALS.filter((a) => a.status === "pending");
    return getPendingApprovals();
  } catch {
    return [];
  }
}

export async function approve(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const demo = await isDemoMode();
    return runWithDemoMode(demo, async () => {
      assertNotDemoMode("Approving actions");
      const result = approveAction(id);
      if (result) await applyApprovalPayload(result);
      return { ok: !!result };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function reject(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const demo = await isDemoMode();
    return runWithDemoMode(demo, async () => {
      assertNotDemoMode("Rejecting actions");
      const result = rejectAction(id);
      return { ok: !!result };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
