/**
 * Bright Line Studio OS – Concierge Agent (Reception)
 *
 * Uses AI layer (Ollama or fallback). Persists events and project drafts.
 */

import { getTool } from "@/lib/tools/registry";
import { logEvent } from "@/lib/events/logger";
import { saveDraft } from "@/lib/drafts/store";
import { createHandoffForWorkspace } from "@/lib/handoffs/store";
import { getSessionForWorkspace, createSession, updateSessionForWorkspace } from "@/lib/sessions/store";
import { getRoomAssistModeForWorkspace } from "@/lib/roomSettings/store";
import { DEFAULT_AUTOMATION_RULES } from "@/lib/automation/defaultRules";
import { runAutomationWithOptions } from "@/lib/automation/engine";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";

export type ReceptionInquiryInput = { text: string };

export type ReceptionAnalysisResult = {
  summary: string;
  tone: string;
  intent: string;
  projectType: string;
  confidence: string;
  replyDraft: string;
  source?: "ollama" | "fallback";
};

export async function runReceptionAnalysis(input: ReceptionInquiryInput): Promise<ReceptionAnalysisResult> {
  const ctx = await requireWorkspaceContext();
  const text = input.text?.trim() ?? "";
  const summarize = getTool("summarize_inquiry");
  const classify = getTool("classify_project_type");
  const reply = getTool("generate_reply_draft");

  if (!summarize || !classify || !reply) {
    throw new Error("Reception tools not found");
  }

  const [sumResult, classResult, replyResult] = await Promise.all([
    summarize.run({ text }),
    classify.run({ text }),
    reply.run({ text }),
  ]);

  const summaryData = sumResult as { summary: string; tone: string; intent: string; source?: "ollama" | "fallback" };
  const classData = classResult as { projectType: string; confidence: string; source?: "ollama" | "fallback" };
  const replyData = replyResult as { draft: string; source?: "ollama" | "fallback" };

  const source = replyData.source ?? summaryData.source ?? classData.source ?? "fallback";
  const shortSummary = text
    ? `Reception analyzed new inquiry (${text.slice(0, 50)}…)`
    : "Reception analyzed new inquiry";
  logEvent({
    room: "reception",
    agent: "Concierge Agent",
    type: "inquiry_analyzed",
    status: "success",
    summary: `${shortSummary} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    workspaceId: ctx.workspaceId,
  });

  let session = getSessionForWorkspace(ctx.workspaceId, "reception");
  if (!session) session = createSession({ room: "reception", workspaceId: ctx.workspaceId });
  updateSessionForWorkspace(ctx.workspaceId, "reception", {
    lastAction: "inquiry_analyzed",
    lastOutput: JSON.stringify({ projectType: classData.projectType, summary: summaryData.summary }),
  });

  const projectDraft = {
    project_name: text.slice(0, 60) || "New inquiry",
    client: "unknown",
    type: classData.projectType,
    notes: summaryData.summary,
  };
  saveDraft({
    type: "project_draft",
    room: "reception",
    content: JSON.stringify(projectDraft, null, 2),
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
  });

  createHandoffForWorkspace(ctx.workspaceId, "reception", "production", {
    projectName: projectDraft.project_name,
    client: projectDraft.client,
    type: projectDraft.type,
    summary: summaryData.summary,
    inquirySnippet: text.slice(0, 150),
  });

  const assistMode = getRoomAssistModeForWorkspace(ctx.workspaceId, "reception", null);
  if (assistMode !== "off") {
    const evt = {
      trigger: "new inquiry analyzed",
      payload: replyData.draft,
      room: "reception" as const,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
    };
    const matching = DEFAULT_AUTOMATION_RULES.filter(
      (r) => r.isActive && r.trigger.trim().toLowerCase() === evt.trigger.trim().toLowerCase()
    );
    const results = await Promise.all(matching.map((r) => runAutomationWithOptions(r, evt, { assistMode })));
    updateSessionForWorkspace(ctx.workspaceId, "reception", {
      lastAction: "assist_mode_automation",
      lastOutput: JSON.stringify(
        {
          assistMode,
          trigger: evt.trigger,
          results: results.map((r) => (r.status === "skipped" ? { status: "skipped", reason: r.reason } : { status: r.status })),
        },
        null,
        2
      ),
    });
  }

  return {
    summary: summaryData.summary,
    tone: summaryData.tone,
    intent: summaryData.intent,
    projectType: classData.projectType,
    confidence: classData.confidence,
    replyDraft: replyData.draft,
    source,
  };
}
