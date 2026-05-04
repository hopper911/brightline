import OpenAI, { APIError } from "openai";

export type ProjectSeoCheckInput = {
  projectTitle?: string;
  slug?: string;
  pillar?: string;
  seoTitle?: string;
  metaDescription?: string;
  projectTags?: string;
  opening?: string;
  imageAltText?: string[];
  ctaCopy?: string;
};

export type ProjectSeoCheckResult = {
  score: number;
  issues: string[];
  suggestions: string[];
  improvedSeoTitle?: string;
  improvedMetaDescription?: string;
  suggestedTags?: string[];
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 80);
}

export function parseSeoCheckInput(body: unknown):
  | { ok: true; data: ProjectSeoCheckInput }
  | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const obj = body as Record<string, unknown>;
  return {
    ok: true,
    data: {
      projectTitle: cleanString(obj.projectTitle),
      slug: cleanString(obj.slug),
      pillar: cleanString(obj.pillar),
      seoTitle: cleanString(obj.seoTitle),
      metaDescription: cleanString(obj.metaDescription),
      projectTags: cleanString(obj.projectTags),
      opening: cleanString(obj.opening),
      imageAltText: cleanStringArray(obj.imageAltText),
      ctaCopy: cleanString(obj.ctaCopy),
    },
  };
}

const SYSTEM_PROMPT = `You are the SEO editor for BRIGHTLINE Photography, a polished commercial photography studio serving New Jersey and the New York metro.

Analyze project page SEO for local/commercial intent while preserving a refined editorial tone.

Rules:
- SEO title should be under 60 characters when possible.
- Meta description should be around 140-160 characters.
- Avoid keyword stuffing.
- Prioritize commercial, local, project-specific intent when relevant.
- Tone: polished, editorial, strategic, modern, clear, high-end.
- Avoid hype, cliches, and generic AI language.
- Do not invent facts, clients, locations, awards, or claims.

Return JSON only with:
{
  "score": 0,
  "issues": [],
  "suggestions": [],
  "improvedSeoTitle": "",
  "improvedMetaDescription": "",
  "suggestedTags": []
}`;

function clampScore(value: unknown) {
  const score = typeof value === "number" && Number.isFinite(value) ? value : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function stringList(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd();
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned invalid JSON.");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeResult(raw: Record<string, unknown>): ProjectSeoCheckResult {
  const improvedSeoTitle = cleanString(raw.improvedSeoTitle);
  const improvedMetaDescription = cleanString(raw.improvedMetaDescription);
  const suggestedTags = stringList(raw.suggestedTags, 16);

  return {
    score: clampScore(raw.score),
    issues: stringList(raw.issues, 16),
    suggestions: stringList(raw.suggestions, 16),
    ...(improvedSeoTitle ? { improvedSeoTitle: truncate(improvedSeoTitle, 70) } : {}),
    ...(improvedMetaDescription ? { improvedMetaDescription: truncate(improvedMetaDescription, 180) } : {}),
    ...(suggestedTags.length ? { suggestedTags } : {}),
  };
}

export async function seoCheckProject(input: ProjectSeoCheckInput): Promise<ProjectSeoCheckResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("AI generation is not configured."), { status: 500 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: "Analyze this project page SEO and suggest improvements.",
              input,
              scoringGuidance: {
                title: "Project title, slug, SEO title, and meta description should work together without repetition.",
                localIntent: "Use New Jersey, New York metro, NYC, Brooklyn, Jersey City, or Hoboken only when supported by input.",
                commercialIntent: "Prefer practical search language for commercial photography buyers.",
                altText: "Flag missing or generic image alt text.",
              },
            },
            null,
            2
          ),
        },
      ],
    });
    return normalizeResult(parseJsonObject(completion.choices[0]?.message?.content ?? "{}"));
  } catch (err: unknown) {
    if (err instanceof APIError) {
      const status = err.status === 429 ? 429 : err.status === 408 ? 504 : 502;
      const message =
        err.status === 429
          ? "Rate limited by the model provider. Try again shortly."
          : err.status === 401 || err.status === 403
            ? "Model provider rejected credentials."
            : "AI SEO check failed.";
      throw Object.assign(new Error(message), { status });
    }
    throw err;
  }
}

