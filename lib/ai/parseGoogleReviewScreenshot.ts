import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";
import { fetchPublicImageAsDataUrl } from "@/lib/fetch-public-image";

export type ParsedGoogleReviewScreenshot = {
  placeName: string;
  placeAddress: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
};

const SYSTEM_PROMPT = `You extract a Google Maps review from a screenshot for BRIGHTLINE Photography.
Return ONLY valid JSON with these keys:
- placeName (string): restaurant / place title
- placeAddress (string): address if visible, else ""
- rating (number): overall star rating 1-5 (integer)
- reviewText (string): the written review body only (not Food/Service attribute rows, not Like/Share)
- relativeTime (string): e.g. "4 days ago" if visible, else ""

Do not invent dishes or text that are not visible. If the review is truncated, extract what you can see.`;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function parseJsonPayload(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() || trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON.");
  return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
}

export async function parseGoogleReviewScreenshot(
  imageUrl: string,
  origin: string
): Promise<ParsedGoogleReviewScreenshot> {
  const dataUrl = await fetchPublicImageAsDataUrl(imageUrl, origin, { maxBytes: 10 * 1024 * 1024 });
  const openai = createOpenAiClient();
  const model = resolveOpenAiChatModel();

  const completion = await runAiChatCompletion(
    openai,
    {
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the Google Maps review fields from this screenshot as JSON.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    },
    {
      taskType: "google_review.parse_screenshot",
      promptId: "google_review.parse_screenshot",
      promptVersion: 1,
      createdBy: "admin",
      inputSummary: { hasImageUrl: true },
    }
  );

  const raw = completion.choices[0]?.message?.content || "";
  const row = parseJsonPayload(raw);
  const placeName = cleanString(row.placeName);
  const reviewText = cleanString(row.reviewText);
  if (!placeName && !reviewText) {
    throw Object.assign(new Error("Could not read a review from that screenshot."), {
      status: 422,
    });
  }

  return {
    placeName,
    placeAddress: cleanString(row.placeAddress),
    rating: cleanRating(row.rating),
    reviewText,
    relativeTime: cleanString(row.relativeTime),
  };
}
