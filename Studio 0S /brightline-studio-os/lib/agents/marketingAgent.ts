/**
 * Bright Line Studio OS – Marketing Agent
 *
 * Uses AI layer (Ollama or fallback). Persists drafts, events, session.
 */

import { getTool } from "@/lib/tools/registry";
import { logEvent } from "@/lib/events/logger";
import { saveDraft } from "@/lib/drafts/store";
import { getSession, createSession, updateSession } from "@/lib/sessions/store";
import { createApproval } from "@/lib/approvals/store";

export type MarketingCaptionInput = { projectId: string; projectName: string };
export type MarketingCaptionResult = { caption: string; draftId: string; source?: "ollama" | "fallback" };

export async function runMarketingCaption(input: MarketingCaptionInput): Promise<MarketingCaptionResult> {
  const captionTool = getTool("generate_instagram_caption");
  if (!captionTool) throw new Error("Caption tool not found");

  const result = (await captionTool.run({ projectName: input.projectName })) as {
    caption: string;
    source?: "ollama" | "fallback";
  };
  const draft = saveDraft({
    type: "instagram_caption",
    room: "marketing",
    content: result.caption,
    projectId: input.projectId,
  });
  const source = result.source ?? "fallback";
  logEvent({
    room: "marketing",
    agent: "Marketing Agent",
    type: "content_generated",
    status: "success",
    summary: `Marketing generated caption for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
  });

  let session = getSession("marketing");
  if (!session) session = createSession({ room: "marketing", projectId: input.projectId });
  updateSession("marketing", {
    lastAction: "caption_generated",
    lastOutput: result.caption,
    projectId: input.projectId,
  });

  return { caption: result.caption, draftId: draft.id, source };
}

export type MarketingCaseStudyInput = { projectId: string; projectName: string };
export type MarketingCaseStudyResult = { title: string; sections: string[]; draftId: string; source?: "ollama" | "fallback" };

export async function runMarketingCaseStudy(input: MarketingCaseStudyInput): Promise<MarketingCaseStudyResult> {
  const caseStudyTool = getTool("generate_case_study");
  if (!caseStudyTool) throw new Error("Case study tool not found");

  const result = (await caseStudyTool.run({ projectName: input.projectName })) as {
    title: string;
    sections: string[];
    source?: "ollama" | "fallback";
  };
  const content = [result.title, ...result.sections].join("\n\n");
  const draft = saveDraft({
    type: "case_study",
    room: "marketing",
    content,
    projectId: input.projectId,
  });
  const source = result.source ?? "fallback";
  logEvent({
    room: "marketing",
    agent: "Marketing Agent",
    type: "content_generated",
    status: "success",
    summary: `Marketing generated case study for ${input.projectName} using ${source === "ollama" ? "Ollama" : "fallback"}`,
    projectId: input.projectId,
  });

  createApproval({
    actionType: "case_study",
    room: "marketing",
    payload: { title: result.title, projectName: input.projectName },
  });

  let session = getSession("marketing");
  if (!session) session = createSession({ room: "marketing", projectId: input.projectId });
  updateSession("marketing", {
    lastAction: "case_study_generated",
    lastOutput: content,
    projectId: input.projectId,
  });

  return { title: result.title, sections: result.sections, draftId: draft.id, source };
}
