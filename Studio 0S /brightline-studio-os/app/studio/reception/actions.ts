"use server";

/**
 * Mock analysis of an inquiry. Visual-only: no DB or event logging.
 * Re-add logEvent() from @/lib/events/logger when deploying with SQLite.
 */
export interface AnalyzeResult {
  summary: string;
  suggestedType: string;
  priority: string;
}

export async function analyzeInquiry(formData: FormData): Promise<AnalyzeResult> {
  const raw = formData.get("inquiry") ?? "";
  const inquiry = typeof raw === "string" ? raw.trim() : "";

  return {
    summary: inquiry
      ? `Inquiry analyzed: "${inquiry.slice(0, 80)}${inquiry.length > 80 ? "…" : ""}". Suggested: brand shoot, high priority.`
      : "No text provided. Enter an inquiry to analyze.",
    suggestedType: "brand",
    priority: "high",
  };
}
