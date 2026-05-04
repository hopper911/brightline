import OpenAI, { APIError } from "openai";
import { DELIVERY_GROUPS, normalizeDeliveryGroup } from "@/lib/delivery/package";

export type DeliveryRecommendationInput = {
  projectId: string;
  projectContext: Record<string, unknown>;
  images: Array<{
    id: string;
    url: string;
    filename?: string;
    existingAltText?: string;
    existingCaption?: string;
  }>;
};

export type DeliveryRecommendation = {
  id: string;
  recommendedDeliveryGroup: string;
  usageSuggestion: string;
  clientFacingCaption: string;
  aiDescription: string;
  imagePurpose: string;
  confidenceScore: number;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clampScore(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 75;
}

async function imageUrlToDataUrl(imageUrl: string) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw Object.assign(new Error(`Could not load image (${res.status}).`), { status: 400 });
  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) throw Object.assign(new Error("Image URL must point to an image."), { status: 400 });
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) throw Object.assign(new Error("Image is too large for delivery analysis."), { status: 400 });
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

function normalizeRecommendation(raw: Record<string, unknown>, fallbackId: string): DeliveryRecommendation {
  const group = normalizeDeliveryGroup(raw.recommendedDeliveryGroup) ?? "archive";
  return {
    id: cleanString(raw.id) || fallbackId,
    recommendedDeliveryGroup: group,
    usageSuggestion: cleanString(raw.usageSuggestion).slice(0, 320),
    clientFacingCaption: cleanString(raw.clientFacingCaption).slice(0, 240),
    aiDescription: cleanString(raw.aiDescription).slice(0, 420),
    imagePurpose: cleanString(raw.imagePurpose).slice(0, 180),
    confidenceScore: clampScore(raw.confidenceScore),
  };
}

export async function generateDeliveryRecommendations(input: DeliveryRecommendationInput) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw Object.assign(new Error("AI delivery recommendations are not configured."), { status: 500 });
  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_VISION_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const images = input.images.slice(0, 50);
  const results: DeliveryRecommendation[] = [];

  for (const image of images) {
    const dataUrl = await imageUrlToDataUrl(image.url);
    try {
      const completion = await openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are the delivery editor for BRIGHTLINE Photography. Recommend how a completed project image should be packaged for a client. Bright Line delivers a ready-to-use visual system, not just a folder of images. Return JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  projectId: input.projectId,
                  projectContext: input.projectContext,
                  image: {
                    id: image.id,
                    filename: image.filename,
                    existingAltText: image.existingAltText,
                    existingCaption: image.existingCaption,
                  },
                  allowedDeliveryGroups: DELIVERY_GROUPS,
                  responseShape: {
                    id: image.id,
                    recommendedDeliveryGroup: "hero | interior | details | web | print | social | archive",
                    usageSuggestion: "Client-ready use case guidance.",
                    clientFacingCaption: "Polished caption for the delivery package.",
                    aiDescription: "Operational description for the studio/admin.",
                    imagePurpose: "Why this image belongs in the final system.",
                    confidenceScore: 0,
                  },
                  rules: [
                    "Do not say anything has been published, moved, or finalized.",
                    "Keep language polished, editorial, minimal, and useful.",
                    "Preserve existing human captions when useful; improve clarity but do not overwrite directly.",
                    "Use archive for backups, repeats, weak frames, or secondary images.",
                  ],
                }),
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      });
      results.push(normalizeRecommendation(parseJsonObject(completion.choices[0]?.message?.content ?? "{}"), image.id));
    } catch (err: unknown) {
      if (err instanceof APIError) {
        const status = err.status === 429 ? 429 : err.status === 408 ? 504 : 502;
        throw Object.assign(new Error("AI delivery recommendations failed."), { status });
      }
      throw err;
    }
  }

  return { images: results };
}

