"use server";

import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import type { AutomationRule } from "@/lib/automation/types";
import { isDemoMode } from "@/lib/runtime/demo";
import { DEMO_APPROVALS, DEMO_EVENTS } from "@/lib/studio/demoData";
import { DEFAULT_AUTOMATION_RULES } from "@/lib/automation/defaultRules";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { Approval } from "@/lib/approvals/store";
import type { EventRecord } from "@/lib/events/logger";

export async function getAutomationRules(): Promise<AutomationRule[]> {
  const entitlements = getEntitlements();
  if (!entitlements.automation) return [];
  return DEFAULT_AUTOMATION_RULES;
}

export async function getPendingAutomationApprovals() {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) {
    return DEMO_APPROVALS.filter((a) => a.actionType === "automation_prepared_action" && a.status === "pending").map(
      (a): Approval => ({
        id: a.id,
        workspaceId: "demo-workspace",
        actionType: a.actionType,
        room: a.room,
        status: a.status,
        payloadJson: a.payloadJson,
        createdAt: a.createdAt,
      })
    );
  }
  const { getPendingApprovals } = await import("@/lib/approvals/store");
  return getPendingApprovals().filter((a) => a.actionType === "automation_prepared_action");
}

export async function getRecentAutomationEvents(): Promise<EventRecord[]> {
  if (await isDemoMode()) {
    return DEMO_EVENTS.filter((e) => e.room === "automation").slice(0, 20).map(
      (e): EventRecord => ({
        id: e.id,
        room: e.room,
        projectId: e.projectId,
        agent: e.agent,
        type: e.type,
        status: e.status,
        summary: e.summary,
        createdAt: e.createdAt,
      })
    );
  }
  const { getEvents } = await import("@/lib/events/logger");
  const events = getEvents();
  return events.filter((e) => e.room === "automation").slice(0, 20);
}

