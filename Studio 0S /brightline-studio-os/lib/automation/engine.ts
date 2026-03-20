import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import { logEvent } from "@/lib/events/logger";
import type { AssistMode } from "@/lib/roomSettings/store";
import type { AutomationContext, AutomationEvent, AutomationPreparedAction, AutomationResult, AutomationRule, Priority } from "./types";
import { computeReminderPolicy } from "@/lib/automation/reminderPolicy";

function matchesTrigger(rule: AutomationRule, evt: AutomationEvent): boolean {
  return rule.isActive && rule.trigger.trim().toLowerCase() === evt.trigger.trim().toLowerCase();
}

/**
 * Safe condition evaluator.
 * Supported:
 * - "" / "true" → always true
 * - "projectId exists"
 * - "projectType == brand"
 * - "clientType == agency"
 * - "stage == booked"
 * - "urgency in (low, normal, high, urgent)"
 */
function matchesCondition(rule: AutomationRule, evt: AutomationEvent, ctx: AutomationContext): boolean {
  const c = rule.condition.trim().toLowerCase();
  if (!c || c === "true") return true;
  if (c === "projectid exists") return !!evt.projectId;

  const eq = c.match(/^(projecttype|clienttype|stage)\s*==\s*([a-z0-9_-]+)$/i);
  if (eq) {
    const left = eq[1].toLowerCase();
    const right = eq[2].toLowerCase();
    const value =
      left === "projecttype"
        ? ctx.projectType
        : left === "clienttype"
          ? ctx.clientType
          : left === "stage"
            ? ctx.stage
            : null;
    return (value ?? "").toLowerCase() === right;
  }

  const inList = c.match(/^urgency\s+in\s*\(([^)]+)\)$/i);
  if (inList) {
    const items = inList[1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return items.includes((ctx.urgency ?? "").toLowerCase());
  }

  return false;
}

async function loadContext(evt: AutomationEvent): Promise<AutomationContext> {
  const projectId = evt.projectId ?? null;
  if (!projectId) {
    return {
      projectId: null,
      projectType: null,
      urgency: null,
      clientType: null,
      stage: null,
      projectSize: null,
      timeline: null,
      clientResponsiveness: "unknown",
    };
  }

  const { getProjectForWorkspace } = await import("@/lib/projects/store");
  const p = getProjectForWorkspace(evt.workspaceId, projectId);

  return {
    projectId,
    projectType: p?.type ?? null,
    urgency: p?.urgency ?? null,
    clientType: p?.clientType ?? null,
    stage: p?.stage ?? (p?.status ?? null),
    projectSize: p?.projectSize ?? null,
    timeline: p?.timeline ?? null,
    clientResponsiveness: "unknown",
  };
}

function computePriorityAndReason(rule: AutomationRule, evt: AutomationEvent, ctx: AutomationContext): { priority: Priority; reason: string } {
  const urgency = (ctx.urgency ?? "").toLowerCase();
  if (urgency === "urgent") return { priority: "urgent", reason: "Project urgency is urgent." };
  if (urgency === "high") return { priority: "high", reason: "Project urgency is high." };
  if (urgency === "low") return { priority: "low", reason: "Project urgency is low." };

  if ((ctx.stage ?? "").toLowerCase().includes("delivery")) {
    return { priority: "high", reason: "Project is in a delivery stage." };
  }

  if (!evt.projectId) {
    return { priority: "normal", reason: "No project linked; using default priority." };
  }

  return { priority: "normal", reason: "Default automation priority." };
}

function prepareAction(params: {
  rule: AutomationRule;
  evt: AutomationEvent;
  ctx: AutomationContext;
  mode: AssistMode;
}): AutomationPreparedAction | null {
  const { rule, evt, ctx, mode } = params;
  const action = rule.action.trim().toLowerCase();
  const room = evt.room ?? "automation";
  const projectId = evt.projectId ?? null;
  const { priority, reason } = computePriorityAndReason(rule, evt, ctx);
  const meta = { priority, reason, ctx };

  if (mode === "suggest") {
    const suggestion = `Recommended action: ${rule.action}. Reason: ${reason}`;
    return { kind: "suggest_next_task", room, suggestion, projectId, meta };
  }

  if (action === "generate reply draft" || action === "create draft response") {
    const content =
      typeof evt.payload === "string"
        ? evt.payload
        : "Draft reply prepared. Open the inquiry to edit and send manually.";
    return {
      kind: "create_draft",
      room: room === "reception" ? "reception" : "reception",
      draftType: "reply",
      content,
      projectId,
      meta,
    };
  }

  if (action === "create reminder") {
    const policy = computeReminderPolicy({ reminderType: "follow-up", ctx });
    return {
      kind: "create_reminder",
      reminderType: "follow-up",
      message: policy.message,
      dueDate: policy.dueDate,
      projectId,
      meta: { ...meta, priority: policy.priority, reason: policy.reason },
    };
  }

  if (action === "suggest next task") {
    return {
      kind: "suggest_next_task",
      room,
      suggestion: "Review project status and pick the next most constrained step.",
      projectId,
      meta,
    };
  }

  return null;
}

export function evaluateRules(evt: AutomationEvent, rules: AutomationRule[]): AutomationRule[] {
  // Context-aware evaluation is performed in runAutomation / workflows; this is kept for legacy callers.
  return rules.filter((r) => matchesTrigger(r, evt));
}

export async function queueActionForApproval(params: {
  rule: AutomationRule;
  evt: AutomationEvent;
  prepared: AutomationPreparedAction;
}): Promise<AutomationResult> {
  if (isVercelVisualOnly()) {
    return { status: "skipped", reason: "Vercel visual-only" };
  }

  const { createApproval } = await import("@/lib/approvals/store");

  const approval = createApproval({
    actionType: "automation_prepared_action",
    room: params.evt.room ?? "automation",
    payload: {
      ruleId: params.rule.id,
      ruleName: params.rule.name,
      trigger: params.evt.trigger,
      prepared: params.prepared,
      projectId: params.evt.projectId ?? null,
    },
    workspaceId: params.evt.workspaceId,
    projectId: params.evt.projectId ?? null,
  });

  logEvent({
    room: "automation",
    agent: "Automation Engine",
    type: "automation_queued_for_approval",
    status: "ok",
    summary: `Queued: ${params.rule.name}`,
    projectId: params.evt.projectId ?? null,
    workspaceId: params.evt.workspaceId,
  });

  return { status: "queued_for_approval", ruleId: params.rule.id, approvalId: approval.id };
}

export async function runAutomation(rule: AutomationRule, evt: AutomationEvent): Promise<AutomationResult> {
  return runAutomationWithOptions(rule, evt, { assistMode: "assist" });
}

export async function runAutomationWithOptions(
  rule: AutomationRule,
  evt: AutomationEvent,
  opts: { assistMode: AssistMode }
): Promise<AutomationResult> {
  if (isVercelVisualOnly()) {
    return { status: "skipped", reason: "Vercel visual-only" };
  }
  if (!matchesTrigger(rule, evt)) return { status: "skipped", reason: "Trigger mismatch or inactive" };
  if (opts.assistMode === "off") return { status: "skipped", reason: "Assist mode is off" };

  const ctx = await loadContext(evt);
  if (!matchesCondition(rule, evt, ctx)) return { status: "skipped", reason: "Condition did not match" };

  const prepared = prepareAction({ rule, evt, ctx, mode: opts.assistMode });
  if (!prepared) return { status: "skipped", reason: "Unsupported action" };

  logEvent({
    room: "automation",
    agent: "Automation Engine",
    type: "automation_prepared",
    status: "ok",
    summary: `Prepared: ${rule.name}`,
    projectId: evt.projectId ?? null,
    workspaceId: evt.workspaceId,
  });

  if (opts.assistMode === "suggest") {
    return { status: "prepared", ruleId: rule.id, prepared };
  }

  if (rule.requiresApproval) {
    return queueActionForApproval({ rule, evt, prepared });
  }

  // Non-approval path is still safe: only writes local drafts/reminders, never external actions.
  if (prepared.kind === "create_draft") {
    const { saveDraft } = await import("@/lib/drafts/store");
    saveDraft({
      room: prepared.room,
      type: prepared.draftType,
      content: prepared.content,
      projectId: prepared.projectId ?? undefined,
      workspaceId: evt.workspaceId,
      userId: evt.userId,
    });
    return { status: "prepared", ruleId: rule.id, prepared };
  }

  if (prepared.kind === "create_reminder") {
    const { createReminder } = await import("@/lib/reminders/store");
    createReminder({
      type: prepared.reminderType,
      message: prepared.message,
      dueDate: prepared.dueDate,
      projectId: prepared.projectId ?? undefined,
      workspaceId: evt.workspaceId,
    });
    return { status: "prepared", ruleId: rule.id, prepared };
  }

  return { status: "prepared", ruleId: rule.id, prepared };
}

