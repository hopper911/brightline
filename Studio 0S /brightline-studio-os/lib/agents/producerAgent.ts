/**
 * Bright Line Studio OS – Producer Agent
 *
 * Uses AI layer for briefs, shot lists, checklists. Integrates with
 * events, sessions, approvals. Requires approval before saving briefs.
 */

import { getTool } from "@/lib/tools/registry";
import { logEvent } from "@/lib/events/logger";
import { saveDraft } from "@/lib/drafts/store";
import { getSessionForWorkspace, createSession, updateSessionForWorkspace } from "@/lib/sessions/store";
import { createApproval } from "@/lib/approvals/store";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";

export type ProducerBriefInput = { projectId: string; projectName: string; notes: string };
export type ProducerBriefResult = {
  project_name: string;
  client: string;
  type: string;
  notes: string;
  draftId: string;
  source?: "ollama" | "fallback";
};

export async function runGenerateProjectBrief(input: ProducerBriefInput): Promise<ProducerBriefResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const briefTool = getTool("generate_project_brief");
  if (!briefTool) return { error: "Brief tool not found" };

  const result = (await briefTool.run({ projectName: input.projectName, notes: input.notes })) as {
    project_name: string;
    client: string;
    type: string;
    notes: string;
    source?: "ollama" | "fallback";
  };
  const draft = saveDraft({
    type: "project_brief",
    room: "production",
    content: JSON.stringify({ project_name: result.project_name, client: result.client, type: result.type, notes: result.notes }, null, 2),
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });
  const source = result.source ?? "fallback";
  logEvent({
    room: "production",
    agent: "Producer Agent",
    type: "brief_generated",
    status: "success",
    summary: `Producer generated brief for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  let session = getSessionForWorkspace(ctx.workspaceId, "production");
  if (!session) session = createSession({ room: "production", projectId: input.projectId, workspaceId: ctx.workspaceId });
  updateSessionForWorkspace(ctx.workspaceId, "production", {
    lastAction: "brief_generated",
    lastOutput: draft.content,
    projectId: input.projectId,
  });

  createApproval({
    actionType: "project_brief_save",
    room: "production",
    payload: { projectId: input.projectId, draftId: draft.id, brief: result },
    workspaceId: ctx.workspaceId,
    projectId: input.projectId,
  });

  return {
    project_name: result.project_name,
    client: result.client,
    type: result.type,
    notes: result.notes,
    draftId: draft.id,
    source,
  };
}

export type ProducerShotListInput = { projectId: string; projectName: string; count?: number };
export type ProducerShotListResult = { shots: string[]; draftId: string; source?: "ollama" | "fallback" };

export async function runGenerateShotList(input: ProducerShotListInput): Promise<ProducerShotListResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const shotTool = getTool("generate_shot_list");
  if (!shotTool) return { error: "Shot list tool not found" };

  const result = (await shotTool.run({ projectName: input.projectName, count: input.count ?? 5 })) as {
    shots: string[];
    source?: "ollama" | "fallback";
  };
  const content = result.shots.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const draft = saveDraft({
    type: "shot_list",
    room: "production",
    content,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });
  const source = result.source ?? "fallback";
  logEvent({
    room: "production",
    agent: "Producer Agent",
    type: "shot_list_generated",
    status: "success",
    summary: `Producer generated shot list for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  let session = getSessionForWorkspace(ctx.workspaceId, "production");
  if (!session) session = createSession({ room: "production", projectId: input.projectId, workspaceId: ctx.workspaceId });
  updateSessionForWorkspace(ctx.workspaceId, "production", {
    lastAction: "shot_list_generated",
    lastOutput: content,
    projectId: input.projectId,
  });

  return { shots: result.shots, draftId: draft.id, source };
}

export type ProducerChecklistInput = { projectId: string; projectName: string; kind: "shoot" | "gear" };
export type ProducerChecklistResult = { items: string[]; draftId: string; source?: "ollama" | "fallback" };

export async function runGenerateChecklist(input: ProducerChecklistInput): Promise<ProducerChecklistResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const checklistTool = getTool("generate_checklist");
  if (!checklistTool) return { error: "Checklist tool not found" };

  const result = (await checklistTool.run({ projectName: input.projectName, kind: input.kind })) as {
    items: string[];
    source?: "ollama" | "fallback";
  };
  const content = result.items.map((s, i) => `[ ] ${i + 1}. ${s}`).join("\n");
  const draft = saveDraft({
    type: input.kind === "gear" ? "gear_checklist" : "shoot_checklist",
    room: "production",
    content,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });
  const source = result.source ?? "fallback";
  logEvent({
    room: "production",
    agent: "Producer Agent",
    type: "checklist_generated",
    status: "success",
    summary: `Producer generated ${input.kind} checklist for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  let session = getSessionForWorkspace(ctx.workspaceId, "production");
  if (!session) session = createSession({ room: "production", projectId: input.projectId, workspaceId: ctx.workspaceId });
  updateSessionForWorkspace(ctx.workspaceId, "production", {
    lastAction: "checklist_generated",
    lastOutput: content,
    projectId: input.projectId,
  });

  return { items: result.items, draftId: draft.id, source };
}

export type ProducerSummarizeInput = { projectId: string; projectName: string; notes: string };
export type ProducerSummarizeResult = { summary: string; priorities: string[]; source?: "ollama" | "fallback" };

export async function runSummarizeProject(input: ProducerSummarizeInput): Promise<ProducerSummarizeResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const summarizeTool = getTool("summarize_project");
  if (!summarizeTool) return { error: "Summarize tool not found" };

  const result = (await summarizeTool.run({ projectName: input.projectName, notes: input.notes })) as {
    summary: string;
    priorities: string[];
    source?: "ollama" | "fallback";
  };
  logEvent({
    room: "production",
    agent: "Producer Agent",
    type: "project_summarized",
    status: "success",
    summary: `Producer summarized ${input.projectName}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  return { summary: result.summary, priorities: result.priorities, source: result.source };
}

export type ProducerStatusSuggestionInput = { projectId: string; suggestedStatus: string };
export function createStatusChangeApproval(input: ProducerStatusSuggestionInput): void {
  // Uses default workspace for now; callers should prefer the workflow/automation path with explicit workspace context.
  createApproval({
    actionType: "project_status_change",
    room: "production",
    payload: { projectId: input.projectId, suggestedStatus: input.suggestedStatus },
  });
}
