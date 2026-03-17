"use server";

import { getPendingApprovals, approveAction, rejectAction } from "@/lib/approvals/store";
import { applyApprovalPayload } from "@/lib/approvals/apply";

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
    return getPendingApprovals();
  } catch {
    return [];
  }
}

export async function approve(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = approveAction(id);
    if (result) applyApprovalPayload(result);
    return { ok: !!result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function reject(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = rejectAction(id);
    return { ok: !!result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
