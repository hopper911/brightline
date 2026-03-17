/**
 * Bright Line Studio OS – AI service layer
 *
 * Routes to Ollama when available, fallback to templates otherwise.
 */

import {
  isOllamaAvailable,
  generateStructuredText,
  type GenerateResult,
} from "./ollama";

export type AIGenerationResult<T> = T & { source: "ollama" | "fallback" };

function fallbackSummary(text: string): { summary: string; tone: string; intent: string } {
  const trimmed = text.trim().slice(0, 500);
  const hasQuestion = /!|\?/.test(trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return {
    summary: trimmed ? `${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}` : "No inquiry text provided.",
    tone: wordCount > 50 ? "detailed" : "brief",
    intent: hasQuestion ? "question" : "request",
  };
}

export async function generateInquirySummary(
  text: string
): Promise<AIGenerationResult<{ summary: string; tone: string; intent: string }>> {
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) {
    return { ...fallbackSummary(""), source: "fallback" };
  }
  const available = await isOllamaAvailable();
  if (!available) {
    return { ...fallbackSummary(trimmed), source: "fallback" };
  }
  const prompt = `Summarize this photography inquiry in 1-2 sentences. Then state: tone (brief/detailed) and intent (question/request). Format: Summary: ... Tone: ... Intent: ...\n\nInquiry: ${trimmed}`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return { ...fallbackSummary(trimmed), source: "fallback" };
  }
  const t = result.text;
  const summary = (t.match(/Summary:\s*([\s\S]+?)(?=Tone:|$)/i)?.[1]?.trim()) || trimmed.slice(0, 120);
  const tone = (t.match(/Tone:\s*(\w+)/i)?.[1]) || "brief";
  const intent = (t.match(/Intent:\s*(\w+)/i)?.[1]) || "request";
  return { summary, tone, intent, source: "ollama" };
}

function fallbackProjectType(text: string): { projectType: string; confidence: string } {
  const lower = text.toLowerCase();
  if (/brand|commercial|corporate/.test(lower)) return { projectType: "brand", confidence: "high" };
  if (/wedding|portrait|family/.test(lower)) return { projectType: "portrait", confidence: "high" };
  if (/editorial|magazine|story/.test(lower)) return { projectType: "editorial", confidence: "high" };
  if (/event|party|gala/.test(lower)) return { projectType: "events", confidence: "high" };
  return { projectType: "general", confidence: "medium" };
}

export async function classifyProjectType(text: string): Promise<
  AIGenerationResult<{ projectType: string; confidence: string }>
> {
  const trimmed = text.trim().toLowerCase().slice(0, 500);
  const available = await isOllamaAvailable();
  if (!available || !trimmed) {
    return { ...fallbackProjectType(trimmed || "general"), source: "fallback" };
  }
  const prompt = `Classify this photography inquiry into one type: brand, portrait, editorial, events, or general. Reply with only: Type: X Confidence: high/medium/low\n\nInquiry: ${trimmed}`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return { ...fallbackProjectType(trimmed), source: "fallback" };
  }
  const projectType = (result.text.match(/Type:\s*(\w+)/i)?.[1]) || "general";
  const confidence = (result.text.match(/Confidence:\s*(\w+)/i)?.[1]) || "medium";
  return { projectType: projectType.toLowerCase(), confidence, source: "ollama" };
}

export async function generateReplyDraft(text: string): Promise<AIGenerationResult<{ draft: string }>> {
  const snippet = text.trim().slice(0, 80) || "your inquiry";
  const available = await isOllamaAvailable();
  if (!available) {
    return {
      draft: `Thank you for reaching out. We've reviewed "${snippet}…" and would love to discuss your project. Our team will follow up within 24 hours with availability and a tailored proposal. — Bright Line Studio`,
      source: "fallback",
    };
  }
  const prompt = `Write a brief, professional reply (2-3 sentences) to this photography inquiry. Sign off as "Bright Line Studio". Keep it warm but concise.\n\nInquiry: ${snippet}`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return {
      draft: `Thank you for reaching out. We've reviewed your inquiry and would love to discuss your project. Our team will follow up within 24 hours. — Bright Line Studio`,
      source: "fallback",
    };
  }
  const draft = result.text.trim().slice(0, 500);
  return { draft: draft || `Thank you for your interest. We'll be in touch. — Bright Line Studio`, source: "ollama" };
}

export async function generateInstagramCaption(projectName: string): Promise<AIGenerationResult<{ caption: string }>> {
  const available = await isOllamaAvailable();
  if (!available) {
    return {
      caption: `Behind the scenes: ${projectName}. Shot with care. — Bright Line Studio`,
      source: "fallback",
    };
  }
  const prompt = `Write a short Instagram caption (1-2 sentences) for a photography project named "${projectName}". End with "— Bright Line Studio". No hashtags.`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return {
      caption: `Behind the scenes: ${projectName}. Shot with care. — Bright Line Studio`,
      source: "fallback",
    };
  }
  const caption = result.text.trim().slice(0, 280);
  return { caption: caption || `Behind the scenes: ${projectName}. — Bright Line Studio`, source: "ollama" };
}

export async function generateCaseStudy(projectName: string): Promise<
  AIGenerationResult<{ title: string; sections: string[] }>
> {
  const available = await isOllamaAvailable();
  if (!available) {
    return {
      title: `Case Study: ${projectName}`,
      sections: [
        "Challenge — What the client needed.",
        "Approach — How we approached the shoot.",
        "Result — Deliverables and impact.",
      ],
      source: "fallback",
    };
  }
  const prompt = `Create a case study outline for photography project "${projectName}". Give a title and 3 short section headings (Challenge, Approach, Result). Format: Title: ... Sections: 1. ... 2. ... 3. ...`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return {
      title: `Case Study: ${projectName}`,
      sections: ["Challenge", "Approach", "Result"],
      source: "fallback",
    };
  }
  const title = (result.text.match(/Title:\s*([\s\S]+?)(?=Sections:|$)/i)?.[1]?.trim()) || `Case Study: ${projectName}`;
  const sectMatch = result.text.match(/Sections?:\s*([\s\S]+)/i);
  const sections = sectMatch
    ? sectMatch[1]
        .split(/\d+\./)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
    : ["Challenge", "Approach", "Result"];
  return { title, sections, source: "ollama" };
}

export async function generateProjectBrief(projectName: string, notes: string): Promise<
  AIGenerationResult<{ project_name: string; client: string; type: string; notes: string }>
> {
  const available = await isOllamaAvailable();
  const fallback = {
    project_name: projectName || "New project",
    client: "Unknown",
    type: "general",
    notes: notes || "No notes.",
    source: "fallback" as const,
  };
  if (!available) return fallback;
  const prompt = `From these notes, extract: project name, client (or "Unknown"), type (brand/portrait/editorial/events/general), and summary notes. Format: project_name: ... client: ... type: ... notes: ...\n\nProject: ${projectName}\nNotes: ${notes.slice(0, 300)}`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) return fallback;
  const t = result.text;
  return {
    project_name: (t.match(/project_name:\s*([\s\S]+?)(?=client:|$)/i)?.[1]?.trim()) || projectName,
    client: (t.match(/client:\s*([\s\S]+?)(?=type:|$)/i)?.[1]?.trim()) || "Unknown",
    type: (t.match(/type:\s*(\w+)/i)?.[1]?.toLowerCase()) || "general",
    notes: (t.match(/notes:\s*([\s\S]+)/i)?.[1]?.trim()) || notes,
    source: "ollama",
  };
}

export async function generateShotList(projectName: string, count?: number): Promise<
  AIGenerationResult<{ shots: string[] }>
> {
  const n = count ?? 5;
  const available = await isOllamaAvailable();
  const fallbackShots = [
    "Wide establishing shot",
    "Medium detail shot",
    "Close-up detail",
    "Environmental portrait",
    "Final hero shot",
  ].slice(0, n);
  if (!available) {
    return { shots: fallbackShots, source: "fallback" };
  }
  const prompt = `List ${n} suggested shot types for photography project "${projectName}". One per line, brief. No numbering.`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return { shots: fallbackShots, source: "fallback" };
  }
  const shots = result.text
    .split(/\n/)
    .map((s) => s.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, n);
  return { shots: shots.length > 0 ? shots : fallbackShots, source: "ollama" };
}

export async function generateChecklist(
  projectName: string,
  kind: "shoot" | "gear"
): Promise<AIGenerationResult<{ items: string[] }>> {
  const available = await isOllamaAvailable();
  const fallbackShoot = [
    "Confirm date and time",
    "Location/location permit",
    "Model/talent call sheet",
    "Wardrobe and props",
    "Lighting plan",
    "Shot list approved",
  ];
  const fallbackGear = [
    "Camera bodies",
    "Lenses",
    "Lighting kit",
    "Reflectors",
    "Backup batteries",
    "Memory cards",
  ];
  const fallback = kind === "shoot" ? fallbackShoot : fallbackGear;
  if (!available) {
    return { items: fallback, source: "fallback" };
  }
  const prompt =
    kind === "shoot"
      ? `Create a shoot day checklist for photography project "${projectName}". List 6–8 items, one per line. Brief. No numbering.`
      : `Create a gear checklist for photography project "${projectName}". List 6–8 items, one per line. Brief. No numbering.`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return { items: fallback, source: "fallback" };
  }
  const items = result.text
    .split(/\n/)
    .map((s) => s.replace(/^\d+\.\s*[-•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return { items: items.length > 0 ? items : fallback, source: "ollama" };
}

export async function summarizeProject(projectName: string, notes: string): Promise<
  AIGenerationResult<{ summary: string; priorities: string[] }>
> {
  const available = await isOllamaAvailable();
  const fallback = {
    summary: notes ? notes.slice(0, 200) : `Project: ${projectName}. No notes.`,
    priorities: ["Confirm deliverables", "Set shoot date", "Lock location"],
    source: "fallback" as const,
  };
  if (!available || !notes.trim()) {
    return fallback;
  }
  const prompt = `Summarize this photography project in 1–2 sentences. Then list 3 priorities. Format: Summary: ... Priorities: 1. ... 2. ... 3. ...\n\nProject: ${projectName}\nNotes: ${notes.slice(0, 400)}`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return fallback;
  }
  const t = result.text;
  const summary = (t.match(/Summary:\s*([\s\S]+?)(?=Priorities:|$)/i)?.[1]?.trim()) || notes.slice(0, 200);
  const prioMatch = t.match(/Priorities?:\s*([\s\S]+)/i);
  const priorities = prioMatch
    ? prioMatch[1]
        .split(/\d+\./)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3)
    : fallback.priorities;
  return { summary, priorities, source: "ollama" };
}

export async function generateDeliveryChecklist(projectName: string): Promise<
  AIGenerationResult<{ items: string[] }>
> {
  const available = await isOllamaAvailable();
  const fallback = [
    "Gallery link ready",
    "Watermark settings confirmed",
    "Delivery email drafted",
    "Client access tested",
    "Archive copy saved",
    "Follow-up reminder scheduled",
  ];
  if (!available) return { items: fallback, source: "fallback" };
  const prompt = `Create a delivery prep checklist for photography project "${projectName}". List 6–8 items for client handoff. One per line. Brief. No numbering.`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) return { items: fallback, source: "fallback" };
  const items = result.text
    .split(/\n/)
    .map((s) => s.replace(/^\d+\.\s*[-•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return { items: items.length > 0 ? items : fallback, source: "ollama" };
}

export async function generateDeliveryEmailDraft(projectName: string, clientName?: string): Promise<
  AIGenerationResult<{ subject: string; body: string }>
> {
  const available = await isOllamaAvailable();
  const client = clientName || "there";
  const fallback = {
    subject: `Your gallery: ${projectName}`,
    body: `Hi ${client},\n\nYour gallery for ${projectName} is ready. You can view and download your images at the link below.\n\n[Gallery link]\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest,\nBright Line Studio`,
    source: "fallback" as const,
  };
  if (!available) return fallback;
  const prompt = `Write a short client handoff email for photography project "${projectName}"${clientName ? `, client: ${clientName}` : ""}. Format: Subject: ... Body: ... Keep it warm and professional. Sign off as Bright Line Studio. No placeholders like [link]—use "your gallery link" in prose.`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) return fallback;
  const t = result.text;
  const subject = (t.match(/Subject:\s*([\s\S]+?)(?=Body:|$)/i)?.[1]?.trim()) || fallback.subject;
  const body = (t.match(/Body:\s*([\s\S]+?)$/i)?.[1]?.trim()) || fallback.body;
  return { subject, body, source: "ollama" };
}

export async function summarizeFinalAssets(projectName: string, notes?: string): Promise<
  AIGenerationResult<{ summary: string; assetCount: string }>
> {
  const available = await isOllamaAvailable();
  const fallback = {
    summary: notes ? notes.slice(0, 150) : `Final deliverables for ${projectName}.`,
    assetCount: "—",
    source: "fallback" as const,
  };
  if (!available) return fallback;
  const prompt = `Summarize final photo deliverables for project "${projectName}"${notes ? `. Context: ${notes.slice(0, 200)}` : ""}. One sentence summary. State approximate asset count if inferrable. Format: Summary: ... Asset count: ...`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) return fallback;
  const t = result.text;
  const summary = (t.match(/Summary:\s*(.+?)(?=Asset count:|$)/i)?.[1]?.trim()) || fallback.summary;
  const assetCount = (t.match(/Asset count:\s*(.+?)$/i)?.[1]?.trim()) || fallback.assetCount;
  return { summary, assetCount, source: "ollama" };
}

export async function generateFollowupText(projectName: string): Promise<AIGenerationResult<{ text: string }>> {
  const available = await isOllamaAvailable();
  const fallback = {
    text: `Quick reminder: your gallery for ${projectName} is ready for review. Let us know if you need anything.`,
    source: "fallback" as const,
  };
  if (!available) return fallback;
  const prompt = `Write a brief follow-up reminder (1–2 sentences) for a client who hasn't viewed their gallery for project "${projectName}". Friendly, not pushy.`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) return fallback;
  const text = result.text.trim().slice(0, 200) || fallback.text;
  return { text, source: "ollama" };
}

import type { HistoricalContext } from "@/lib/analytics";
export type { HistoricalContext };

function fallbackStrategyInsights(ctx: HistoricalContext): string[] {
  const insights: string[] = [];
  if (ctx.revenueByType.length > 0) {
    const top = ctx.revenueByType[0];
    if (top) {
      insights.push(
        `${top.type.replace(/_/g, " ")} is your highest-revenue category with $${top.revenue.toLocaleString()} across ${top.count} projects`
      );
    }
  }
  const bestConversion = ctx.conversionByType
    .filter((c) => c.total >= 3)
    .sort((a, b) => b.ratePct - a.ratePct)[0];
  if (bestConversion && bestConversion.ratePct > 0) {
    insights.push(
      `${bestConversion.type.replace(/_/g, " ")} projects have the highest conversion rate (${bestConversion.ratePct}% delivered)`
    );
  }
  const headshot = ctx.highValuePatterns.find((p) => p.pattern === "headshot");
  if (headshot && headshot.avgRevenue > 0) {
    insights.push(
      `Projects with executive headshots have higher average value ($${headshot.avgRevenue.toLocaleString()} per project)`
    );
  }
  if (ctx.marketingUtilization.deliveredTotal > 0 && ctx.marketingUtilization.pct < 50) {
    insights.push(
      `Marketing content is underutilized: only ${ctx.marketingUtilization.pct}% of delivered projects have marketing drafts`
    );
  }
  if (ctx.repeatClients.length > 0) {
    insights.push(
      `${ctx.repeatClients.length} repeat client(s) — strong opportunity for retention and referrals`
    );
  }
  if (insights.length === 0) {
    insights.push("Add more projects and payments to unlock data-driven insights.");
  }
  return insights;
}

export async function generateStrategyInsights(
  ctx: HistoricalContext
): Promise<AIGenerationResult<{ insights: string[] }>> {
  const available = await isOllamaAvailable();
  if (!available) {
    return { insights: fallbackStrategyInsights(ctx), source: "fallback" };
  }
  const data = JSON.stringify(
    {
      revenueByType: ctx.revenueByType.slice(0, 5),
      conversionByType: ctx.conversionByType.filter((c) => c.total >= 2),
      repeatClients: ctx.repeatClients.slice(0, 5),
      highValuePatterns: ctx.highValuePatterns,
      marketingUtilization: ctx.marketingUtilization,
      newLeads: { last7d: ctx.newLeadsLast7d, last14d: ctx.newLeadsLast14d },
      backlog: { editing: ctx.backlogEditing, delivery: ctx.backlogDelivery },
    },
    null,
    0
  );
  const prompt = `You are a business advisor for a photography studio. Based on this data, generate 3–5 short, actionable insights (one sentence each). Sound like a strategic advisor. Examples: "Office photography is your highest converting niche", "Projects with executive headshots have higher total value", "Marketing content is underutilized for completed projects". Be specific with numbers when available. Output one insight per line, no numbering.\n\nData:\n${data}`;
  const result = await generateStructuredText(prompt);
  if ("error" in result) {
    return { insights: fallbackStrategyInsights(ctx), source: "fallback" };
  }
  const lines = result.text
    .split(/\n/)
    .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((s) => s.length > 20 && s.length < 200)
    .slice(0, 5);
  const insights = lines.length > 0 ? lines : fallbackStrategyInsights(ctx);
  return { insights, source: "ollama" };
}
