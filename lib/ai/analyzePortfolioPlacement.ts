import OpenAI, { APIError } from "openai";

export const PORTFOLIO_PLACEMENTS = [
  "Homepage hero",
  "Work page hero",
  "Portfolio grid",
  "Client gallery only",
  "Internal archive",
] as const;

export type PortfolioPlacement = (typeof PORTFOLIO_PLACEMENTS)[number];

export type PortfolioPlacementContext = {
  clientName?: string;
  projectTitle?: string;
  pillar?: string;
  location?: string;
  whatWasPhotographed?: string;
  visualApproach?: string;
  altText?: string;
};

export type PortfolioPlacementInput = {
  imageUrl: string;
  projectContext: PortfolioPlacementContext;
};

export type PortfolioPlacementResult = {
  recommendedPlacement: PortfolioPlacement;
  confidenceScore: number;
  reason: string;
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 70;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizePlacement(value: unknown): PortfolioPlacement {
  const cleaned = cleanString(value);
  const match = PORTFOLIO_PLACEMENTS.find((placement) => placement.toLowerCase() === cleaned?.toLowerCase());
  return match ?? "Portfolio grid";
}

function normalizeReason(value: unknown) {
  const cleaned = cleanString(value) ?? "Balanced image with useful project context.";
  return cleaned.length <= 260 ? cleaned : cleaned.slice(0, 259).trimEnd();
}

async function imageUrlToDataUrl(imageUrl: string, origin: string) {
  const { trustedImageToDataUrl } = await import("@/lib/safe-fetch-image");
  return trustedImageToDataUrl(imageUrl, origin);
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

export async function analyzePortfolioPlacement(
  input: PortfolioPlacementInput,
  origin: string
): Promise<PortfolioPlacementResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("AI placement analysis is not configured."), { status: 500 });
  }

  const dataUrl = await imageUrlToDataUrl(input.imageUrl, origin);
  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are the portfolio editor for BRIGHTLINE Photography. Assess commercial photography images for manual placement recommendations only. Consider visual strength, composition, brand fit, pillar/category relevance, homepage impact, SEO usefulness, and storytelling value. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                projectContext: input.projectContext,
                allowedPlacements: PORTFOLIO_PLACEMENTS,
                responseShape: {
                  recommendedPlacement: "Homepage hero | Work page hero | Portfolio grid | Client gallery only | Internal archive",
                  confidenceScore: 0,
                  reason: "One concise sentence explaining the recommendation.",
                },
                rules: [
                  "Recommend Homepage hero only for the strongest, most brand-defining image with immediate impact.",
                  "Recommend Work page hero for strong project-leading images tied clearly to the category.",
                  "Recommend Portfolio grid for strong supporting images with clear subject matter.",
                  "Recommend Client gallery only for useful deliverables that are not public-facing portfolio selects.",
                  "Recommend Internal archive for weaker, repetitive, technically limited, or low-context images.",
                  "Do not say the image has been moved or published.",
                ],
              }),
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    });

    const raw = parseJsonObject(completion.choices[0]?.message?.content ?? "{}");
    return {
      recommendedPlacement: normalizePlacement(raw.recommendedPlacement),
      confidenceScore: clampScore(raw.confidenceScore),
      reason: normalizeReason(raw.reason),
    };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      const status = err.status === 429 ? 429 : err.status === 408 ? 504 : 502;
      const message =
        err.status === 429
          ? "Rate limited by the model provider. Try again shortly."
          : err.status === 401 || err.status === 403
            ? "Model provider rejected credentials."
            : "AI placement analysis failed.";
      throw Object.assign(new Error(message), { status });
    }
    throw err;
  }
}

