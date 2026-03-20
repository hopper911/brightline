import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import { logEvent } from "@/lib/events/logger";
import type { AutomationEvent, AutomationRule } from "@/lib/automation/types";
import type { AssistMode } from "@/lib/roomSettings/store";
import { evaluateRules, runAutomationWithOptions } from "@/lib/automation/engine";
import type { WorkspaceProfile } from "@/lib/profile/store";

export type WorkflowStepResult = {
  stepId: string;
  outputs: string[];
};

type WorkflowContext = {
  projectId: string | null;
  projectType: string | null;
  urgency: string | null;
  clientType: string | null;
  stage: string | null;
  projectSize: string | null;
  deliverBy: string | null;
};

async function loadWorkflowContext(event: AutomationEvent): Promise<WorkflowContext> {
  const projectId = event.projectId ?? null;
  if (!projectId) {
    return {
      projectId: null,
      projectType: null,
      urgency: null,
      clientType: null,
      stage: null,
      projectSize: null,
      deliverBy: null,
    };
  }
  const { getProjectForWorkspace } = await import("@/lib/projects/store");
  const p = getProjectForWorkspace(event.workspaceId, projectId);
  return {
    projectId,
    projectType: p?.type ?? null,
    urgency: p?.urgency ?? null,
    clientType: p?.clientType ?? null,
    stage: p?.stage ?? (p?.status ?? null),
    projectSize: p?.projectSize ?? null,
    deliverBy: p?.timeline?.deliverBy ?? null,
  };
}

function matchesSkipCondition(cond: string | undefined, ctx: WorkflowContext): { skip: boolean; reason?: string } {
  const c = (cond ?? "").trim().toLowerCase();
  if (!c) return { skip: false };
  if (c === "true") return { skip: true, reason: "skipCondition=true" };
  if (c === "projectid missing") return { skip: ctx.projectId == null, reason: "No project linked." };

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
    const match = (value ?? "").toLowerCase() === right;
    return { skip: match, reason: `Matched ${eq[1]} == ${eq[2]}.` };
  }

  const inList = c.match(/^urgency\s+in\s*\(([^)]+)\)$/i);
  if (inList) {
    const items = inList[1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const match = items.includes((ctx.urgency ?? "").toLowerCase());
    return { skip: match, reason: `Matched urgency in (${items.join(", ")}).` };
  }

  return { skip: false };
}

export type WorkflowDefinition = {
  id: string;
  name: string;
  steps: { id: string; trigger: string; actionHint: string; requiresApproval: boolean; skipCondition?: string }[];
};

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: "new_client",
    name: "New Client Workflow",
    steps: [
      { id: "analyze_inquiry", trigger: "new inquiry analyzed", actionHint: "suggest next task", requiresApproval: false },
      { id: "draft_reply", trigger: "new inquiry analyzed", actionHint: "generate reply draft", requiresApproval: true },
      { id: "follow_up_reminder", trigger: "proposal sent", actionHint: "create reminder", requiresApproval: true },
    ],
  },
  {
    id: "post_shoot",
    name: "Post-Shoot Workflow",
    steps: [
      { id: "editing_summary", trigger: "shoot completed", actionHint: "suggest next task", requiresApproval: false },
      { id: "delivery_checklist", trigger: "shoot completed", actionHint: "suggest next task", requiresApproval: false },
    ],
  },
  {
    id: "delivery",
    name: "Delivery Workflow",
    steps: [
      { id: "draft_delivery_message", trigger: "delivery ready", actionHint: "create draft response", requiresApproval: true },
      { id: "follow_up_7d", trigger: "delivery sent", actionHint: "create reminder", requiresApproval: true },
    ],
  },
];

export type RecommendedWorkflow = {
  id: string;
  name: string;
  why: string;
  steps: { label: string; roomHint: string }[];
};

function humanizeId(value: string): string {
  return value.replace(/_/g, " ");
}

export function getDefaultWorkflows(profile: WorkspaceProfile | null): RecommendedWorkflow[] {
  if (!profile) {
    return [
      {
        id: "new_client",
        name: "New Client Workflow",
        why: "A simple default: intake → reply → follow-up.",
        steps: [
          { label: "Analyze inquiry", roomHint: "Reception" },
          { label: "Draft reply (approval)", roomHint: "Reception" },
          { label: "Follow-up reminder (approval)", roomHint: "Automation" },
        ],
      },
    ];
  }

  const byGoal: Record<string, RecommendedWorkflow[]> = {
    get_more_clients: [
      {
        id: "new_client",
        name: "New Client Workflow",
        why: "Optimized for speed-to-response and follow-up.",
        steps: [
          { label: "Analyze inquiry", roomHint: "Reception" },
          { label: "Draft reply (approval)", roomHint: "Reception" },
          { label: "Follow-up reminder (approval)", roomHint: "Automation" },
        ],
      },
    ],
    streamline_workflow: [
      {
        id: "post_shoot",
        name: "Post-Shoot Workflow",
        why: "Build consistency after shoots: editing + delivery prep.",
        steps: [
          { label: "Editing summary", roomHint: "Editing" },
          { label: "Delivery checklist", roomHint: "Delivery" },
        ],
      },
    ],
    scale_business: [
      {
        id: "new_client",
        name: "New Client Workflow",
        why: "Increase throughput by tightening intake and follow-up.",
        steps: [
          { label: "Analyze inquiry", roomHint: "Reception" },
          { label: "Draft reply (approval)", roomHint: "Reception" },
          { label: "Follow-up reminder (approval)", roomHint: "Automation" },
        ],
      },
      {
        id: "delivery",
        name: "Delivery Workflow",
        why: "Reduce dropped balls at the finish line.",
        steps: [
          { label: "Draft delivery message (approval)", roomHint: "Delivery" },
          { label: "7-day follow-up (approval)", roomHint: "Automation" },
        ],
      },
    ],
  };

  const key = profile.mainGoal ?? "get_more_clients";
  const recs = byGoal[key] ?? byGoal.get_more_clients;

  const niche = profile.photographyType ? humanizeId(profile.photographyType) : "photography";
  return recs.map((r) => ({
    ...r,
    why: `${r.why} Tuned for ${niche}.`,
  }));
}

export async function runWorkflow(params: {
  workflowId: string;
  event: AutomationEvent;
  rules: AutomationRule[];
  assistMode?: AssistMode;
}): Promise<WorkflowStepResult[]> {
  if (isVercelVisualOnly()) return [];

  const wf = WORKFLOWS.find((w) => w.id === params.workflowId);
  if (!wf) return [];

  const ctx = await loadWorkflowContext(params.event);

  logEvent({
    room: "automation",
    agent: "Workflow Runner",
    type: "workflow_started",
    status: "ok",
    summary: `Workflow started: ${wf.name}`,
    projectId: params.event.projectId ?? null,
    workspaceId: params.event.workspaceId,
  });

  const results: WorkflowStepResult[] = [];

  for (const step of wf.steps) {
    if (params.assistMode === "off") {
      results.push({ stepId: step.id, outputs: ["Skipped: assist mode off."] });
      continue;
    }

    const skipEval = matchesSkipCondition(step.skipCondition, ctx);
    if (skipEval.skip) {
      logEvent({
        room: "automation",
        agent: "Workflow Runner",
        type: "workflow_step_skipped",
        status: "ok",
        summary: `Workflow step skipped: ${wf.id}.${step.id}${skipEval.reason ? ` (${skipEval.reason})` : ""}`,
        projectId: params.event.projectId ?? null,
        workspaceId: params.event.workspaceId,
      });
      results.push({ stepId: step.id, outputs: [`Skipped: ${skipEval.reason ?? "skipCondition matched"}`] });
      continue;
    }

    const evt: AutomationEvent = {
      ...params.event,
      trigger: step.trigger,
      room: params.event.room ?? "automation",
    };

    const matching = evaluateRules(evt, params.rules);
    const outputs: string[] = [];
    if (matching.length === 0) {
      outputs.push(`No rule matched for step ${step.id}.`);
      results.push({ stepId: step.id, outputs });
      continue;
    }

    for (const rule of matching) {
      const res = await runAutomationWithOptions(
        { ...rule, action: step.actionHint, requiresApproval: step.requiresApproval },
        evt,
        { assistMode: params.assistMode ?? "assist" }
      );
      outputs.push(res.status === "skipped" ? `Skipped: ${res.reason}` : `OK: ${res.status}`);
    }

    results.push({ stepId: step.id, outputs });
  }

  logEvent({
    room: "automation",
    agent: "Workflow Runner",
    type: "workflow_completed",
    status: "ok",
    summary: `Workflow completed: ${wf.name}`,
    projectId: params.event.projectId ?? null,
    workspaceId: params.event.workspaceId,
  });

  return results;
}

