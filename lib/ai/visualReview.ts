import OpenAI, { APIError } from "openai";

export type VisualReviewImage = {
  id: string;
  url: string;
  filename?: string;
  altText?: string;
  deliveryGroup?: string;
};

export type VisualReviewInput = {
  projectId: string;
  projectContext: Record<string, unknown>;
  images: VisualReviewImage[];
};

export type VisualReviewResult = {
  images: Array<{
    id: string;
    score: number;
    recommendedPlacement: "hero" | "supporting" | "social" | "archive";
    bestUseCase: "homepage hero" | "listing" | "ad campaign" | "social" | "print";
    useCaseConfidence: number;
    useCaseReasoning: string;
    isTopSelect: boolean;
    isWeak: boolean;
    reason: string;
  }>;
  duplicates: Array<{
    ids: string[];
    reason: string;
  }>;
  topSelectIds: string[];
  weakImageIds: string[];
};

async function imageUrlToDataUrl(imageUrl: string) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw Object.assign(new Error(`Could not load image (${res.status}).`), { status: 400 });
  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) throw Object.assign(new Error("Image URL must point to an image."), { status: 400 });
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw Object.assign(new Error("Image is too large for visual review."), { status: 400 });
  return `data:${contentType};base64,${bytes.toString("base64")}`;
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

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : 70;
}

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizePlacement(value: unknown): "hero" | "supporting" | "social" | "archive" {
  const normalized = cleanString(value).toLowerCase();
  return normalized === "hero" || normalized === "supporting" || normalized === "social" || normalized === "archive"
    ? normalized
    : "supporting";
}

function normalizeBestUseCase(value: unknown): "homepage hero" | "listing" | "ad campaign" | "social" | "print" {
  const normalized = cleanString(value).toLowerCase();
  return normalized === "homepage hero" ||
    normalized === "listing" ||
    normalized === "ad campaign" ||
    normalized === "social" ||
    normalized === "print"
    ? normalized
    : "listing";
}

function normalizeResult(raw: Record<string, unknown>, imageIds: string[]): VisualReviewResult {
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const images = rawImages
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const id = cleanString(item.id);
      return {
        id,
        score: clampScore(item.score),
        recommendedPlacement: normalizePlacement(item.recommendedPlacement),
        bestUseCase: normalizeBestUseCase(item.bestUseCase),
        useCaseConfidence: clampScore(item.useCaseConfidence),
        useCaseReasoning: cleanString(item.useCaseReasoning, "Recommended based on visual strength and client usefulness.").slice(0, 260),
        isTopSelect: Boolean(item.isTopSelect),
        isWeak: Boolean(item.isWeak),
        reason: cleanString(item.reason, "Reviewed for delivery strength.").slice(0, 260),
      };
    })
    .filter((item) => imageIds.includes(item.id));

  const duplicates = (Array.isArray(raw.duplicates) ? raw.duplicates : [])
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      ids: Array.isArray(item.ids) ? item.ids.map((id) => cleanString(id)).filter((id) => imageIds.includes(id)) : [],
      reason: cleanString(item.reason, "Visually similar images.").slice(0, 220),
    }))
    .filter((item) => item.ids.length > 1);

  const topSelectIds = (Array.isArray(raw.topSelectIds) ? raw.topSelectIds : images.filter((item) => item.isTopSelect).map((item) => item.id))
    .map((id) => cleanString(id))
    .filter((id) => imageIds.includes(id));
  const weakImageIds = (Array.isArray(raw.weakImageIds) ? raw.weakImageIds : images.filter((item) => item.isWeak).map((item) => item.id))
    .map((id) => cleanString(id))
    .filter((id) => imageIds.includes(id));

  return { images, duplicates, topSelectIds, weakImageIds };
}

export async function generateVisualReview(input: VisualReviewInput): Promise<VisualReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw Object.assign(new Error("AI visual review is not configured."), { status: 500 });

  const images = input.images.slice(0, 24);
  const imagePayload = await Promise.all(
    images.map(async (image) => ({
      image,
      dataUrl: await imageUrlToDataUrl(image.url),
    }))
  );
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
            "You are the senior visual editor for BRIGHTLINE Photography. Review a set of final delivery images for curation only. Score each image, identify near-duplicates, suggest top selects, and flag weak images. Do not suggest deleting anything. Return JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                projectId: input.projectId,
                projectContext: input.projectContext,
                images: images.map((image) => ({
                  id: image.id,
                  filename: image.filename,
                  altText: image.altText,
                  deliveryGroup: image.deliveryGroup,
                })),
                responseShape: {
                  images: [
                    {
                      id: "image id",
                      score: 0,
                      recommendedPlacement: "hero | supporting | social | archive",
                      bestUseCase: "homepage hero | listing | ad campaign | social | print",
                      useCaseConfidence: 0,
                      useCaseReasoning: "Why this is the best use case.",
                      isTopSelect: false,
                      isWeak: false,
                      reason: "Short editorial reason.",
                    },
                  ],
                  duplicates: [{ ids: ["image id", "image id"], reason: "Why they are similar." }],
                  topSelectIds: ["image id"],
                  weakImageIds: ["image id"],
                },
                criteria: [
                  "visual strength",
                  "composition",
                  "brand fit",
                  "storytelling value",
                  "variety across the set",
                  "client usefulness",
                  "technical polish",
                  "best use case: homepage hero, listing, ad campaign, social, print",
                ],
                rules: [
                  "Do not auto-delete or imply deletion.",
                  "Flag weak images as curation guidance only.",
                  "Top selects should be the strongest, most useful images in the set.",
                  "Duplicates means visually redundant or near-identical frames.",
                ],
              }),
            },
            ...imagePayload.map(({ dataUrl }) => ({
              type: "image_url" as const,
              image_url: { url: dataUrl },
            })),
          ],
        },
      ],
    });

    return normalizeResult(parseJsonObject(completion.choices[0]?.message?.content ?? "{}"), images.map((image) => image.id));
  } catch (err: unknown) {
    if (err instanceof APIError) {
      const status = err.status === 429 ? 429 : err.status === 408 ? 504 : 502;
      throw Object.assign(new Error("AI visual review failed."), { status });
    }
    throw err;
  }
}

