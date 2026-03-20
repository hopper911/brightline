/**
 * Bright Line Studio OS – Delivery Agent
 *
 * Draft-focused handoff. Generates checklists, email drafts, asset summaries.
 * No actual email sending or file upload. Approval required for saving drafts.
 */

import { getTool } from "@/lib/tools/registry";
import { logEvent } from "@/lib/events/logger";
import { saveDraft } from "@/lib/drafts/store";
import { getSessionForWorkspace, createSession, updateSessionForWorkspace } from "@/lib/sessions/store";
import { createApproval } from "@/lib/approvals/store";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";

export type DeliveryChecklistInput = { projectId: string; projectName: string };
export type DeliveryChecklistResult = { items: string[]; draftId: string; source?: "ollama" | "fallback" };

export async function runGenerateDeliveryChecklist(
  input: DeliveryChecklistInput
): Promise<DeliveryChecklistResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const tool = getTool("generate_delivery_checklist");
  if (!tool) return { error: "Tool not found" };

  const result = (await tool.run({ projectName: input.projectName })) as {
    items: string[];
    source?: "ollama" | "fallback";
  };
  const content = result.items.map((s, i) => `[ ] ${i + 1}. ${s}`).join("\n");
  const draft = saveDraft({
    type: "delivery_checklist",
    room: "delivery",
    content,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });
  const source = result.source ?? "fallback";

  logEvent({
    room: "delivery",
    agent: "Delivery Agent",
    type: "delivery_checklist_generated",
    status: "success",
    summary: `Delivery generated checklist for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  let session = getSessionForWorkspace(ctx.workspaceId, "delivery");
  if (!session) session = createSession({ room: "delivery", projectId: input.projectId, workspaceId: ctx.workspaceId });
  updateSessionForWorkspace(ctx.workspaceId, "delivery", {
    lastAction: "delivery_checklist_generated",
    lastOutput: content,
    projectId: input.projectId,
  });

  return { items: result.items, draftId: draft.id, source };
}

export type DeliveryEmailInput = { projectId: string; projectName: string; clientName?: string };
export type DeliveryEmailResult = {
  subject: string;
  body: string;
  draftId: string;
  source?: "ollama" | "fallback";
};

export async function runGenerateDeliveryEmail(
  input: DeliveryEmailInput
): Promise<DeliveryEmailResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const tool = getTool("generate_delivery_email_draft");
  if (!tool) return { error: "Tool not found" };

  const result = (await tool.run({
    projectName: input.projectName,
    clientName: input.clientName,
  })) as { subject: string; body: string; source?: "ollama" | "fallback" };
  const content = `Subject: ${result.subject}\n\n${result.body}`;
  const draft = saveDraft({
    type: "delivery_email",
    room: "delivery",
    content,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });
  const source = result.source ?? "fallback";

  logEvent({
    room: "delivery",
    agent: "Delivery Agent",
    type: "delivery_email_generated",
    status: "success",
    summary: `Delivery generated client email for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  createApproval({
    actionType: "delivery_draft_save",
    room: "delivery",
    payload: { projectId: input.projectId, draftId: draft.id, subject: result.subject, body: result.body },
    workspaceId: ctx.workspaceId,
    projectId: input.projectId,
  });

  return { subject: result.subject, body: result.body, draftId: draft.id, source };
}

export type SummarizeAssetsInput = { projectId: string; projectName: string; notes?: string };
export type SummarizeAssetsResult = { summary: string; assetCount: string; source?: "ollama" | "fallback" };

export async function runSummarizeFinalAssets(
  input: SummarizeAssetsInput
): Promise<SummarizeAssetsResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const tool = getTool("summarize_final_assets");
  if (!tool) return { error: "Tool not found" };

  const result = (await tool.run({
    projectName: input.projectName,
    notes: input.notes,
  })) as { summary: string; assetCount: string; source?: "ollama" | "fallback" };

  logEvent({
    room: "delivery",
    agent: "Delivery Agent",
    type: "final_assets_summarized",
    status: "success",
    summary: `Delivery summarized final assets for ${input.projectName}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  return result;
}

export type FollowupInput = { projectId: string; projectName: string };
export type FollowupResult = { text: string; draftId: string; source?: "ollama" | "fallback" };

export async function runGenerateFollowup(input: FollowupInput): Promise<FollowupResult | { error: string }> {
  const ctx = await requireWorkspaceContext();
  const tool = getTool("generate_followup_text");
  if (!tool) return { error: "Tool not found" };

  const result = (await tool.run({ projectName: input.projectName })) as {
    text: string;
    source?: "ollama" | "fallback";
  };
  const draft = saveDraft({
    type: "followup_reminder",
    room: "delivery",
    content: result.text,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });

  logEvent({
    room: "delivery",
    agent: "Delivery Agent",
    type: "followup_generated",
    status: "success",
    summary: `Delivery generated follow-up for ${input.projectName}`,
    projectId: input.projectId,
    workspaceId: ctx.workspaceId,
  });

  return { text: result.text, draftId: draft.id, source: result.source };
}
