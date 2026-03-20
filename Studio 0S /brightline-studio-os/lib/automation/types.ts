export type AutomationRule = {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  requiresApproval: boolean;
  isActive: boolean;
};

export type Priority = "low" | "normal" | "high" | "urgent";

export type ClientResponsiveness = "fast" | "normal" | "slow" | "unknown";

export type AutomationContext = {
  projectId: string | null;
  projectType: string | null;
  urgency: string | null;
  clientType: string | null;
  stage: string | null;
  projectSize: string | null;
  timeline: { shootBy?: string; deliverBy?: string } | null;
  clientResponsiveness: ClientResponsiveness;
};

export type AutomationEvent = {
  trigger: string;
  payload?: unknown;
  projectId?: string | null;
  room?: string;
  workspaceId?: string;
  userId?: string;
  createdAt?: string;
};

export type AutomationPreparedMeta = {
  priority: Priority;
  reason: string;
  ctx?: AutomationContext;
};

export type AutomationPreparedAction =
  | {
      kind: "create_draft";
      room: string;
      draftType: string;
      content: string;
      projectId?: string | null;
      meta: AutomationPreparedMeta;
    }
  | {
      kind: "create_reminder";
      reminderType: "follow-up" | "delivery" | "payment";
      message: string;
      dueDate: string;
      projectId?: string | null;
      meta: AutomationPreparedMeta;
    }
  | {
      kind: "suggest_next_task";
      room: string;
      suggestion: string;
      projectId?: string | null;
      meta: AutomationPreparedMeta;
    };

export type AutomationResult =
  | { status: "skipped"; reason: string }
  | { status: "prepared"; ruleId: string; prepared: AutomationPreparedAction }
  | { status: "queued_for_approval"; ruleId: string; approvalId: string };

