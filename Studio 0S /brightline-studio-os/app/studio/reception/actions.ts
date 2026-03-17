"use server";

import { runReceptionAnalysis } from "@/lib/agents/conciergeAgent";

export type ReceptionAnalysisResult = {
  summary: string;
  tone: string;
  intent: string;
  projectType: string;
  confidence: string;
  replyDraft: string;
  source?: "ollama" | "fallback";
};

export async function analyzeInquiry(formData: FormData): Promise<ReceptionAnalysisResult | { error: string }> {
  const raw = formData.get("inquiry") ?? "";
  const text = typeof raw === "string" ? raw : "";
  try {
    return await runReceptionAnalysis({ text });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed" };
  }
}
