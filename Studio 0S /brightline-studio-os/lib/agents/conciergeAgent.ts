/**
 * Bright Line Studio OS – Concierge Agent (Reception)
 *
 * Uses AI layer (Ollama or fallback). Persists events and project drafts.
 */

import { getTool } from "@/lib/tools/registry";
import { logEvent } from "@/lib/events/logger";
import { saveDraft } from "@/lib/drafts/store";
import { createHandoff } from "@/lib/handoffs/store";
import { getSession, createSession, updateSession } from "@/lib/sessions/store";
import { createApproval } from "@/lib/approvals/store";

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
  });

  let session = getSession("reception");
  if (!session) session = createSession({ room: "reception" });
  updateSession("reception", {
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
  });

  createHandoff("reception", "production", {
    projectName: projectDraft.project_name,
    client: projectDraft.client,
    type: projectDraft.type,
    summary: summaryData.summary,
    inquirySnippet: text.slice(0, 150),
  });

  createApproval({
    actionType: "reply_draft",
    room: "reception",
    payload: { draft: replyData.draft, inquirySnippet: text.slice(0, 100) },
  });

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
