import { SHOWCASE_CAPTION_SINGLE_IMAGE } from "@/lib/ai/prompts";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";

export type ShowcaseCaptionContext = {
  pageTitle?: string;
  cardTitle?: string;
  cardLabel?: string;
};

export type GenerateShowcaseCaptionInput = {
  imageUrl: string;
  context: ShowcaseCaptionContext;
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd();
}

export function parseGenerateShowcaseCaptionInput(body: unknown):
  | { ok: true; data: GenerateShowcaseCaptionInput }
  | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const obj = body as Record<string, unknown>;
  const imageUrl = cleanString(obj.imageUrl);
  if (!imageUrl) {
    return { ok: false, status: 400, error: "imageUrl is required." };
  }
  const rawContext =
    obj.context && typeof obj.context === "object" && !Array.isArray(obj.context)
      ? (obj.context as Record<string, unknown>)
      : {};

  return {
    ok: true,
    data: {
      imageUrl,
      context: {
        pageTitle: cleanString(rawContext.pageTitle),
        cardTitle: cleanString(rawContext.cardTitle),
        cardLabel: cleanString(rawContext.cardLabel),
      },
    },
  };
}

async function imageUrlToDataUrl(imageUrl: string, origin: string) {
  const url = new URL(imageUrl, origin);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw Object.assign(new Error("Unsupported image URL."), { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw Object.assign(new Error(`Could not load image for caption (${res.status}).`), {
      status: 400,
    });
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw Object.assign(new Error("imageUrl must point to an image."), { status: 400 });
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) {
    throw Object.assign(new Error("Image is too large for AI caption generation."), { status: 400 });
  }
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

function normalizeCaption(raw: string) {
  return truncate(
    raw
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, " ")
      .trim(),
    240
  );
}

export async function generateShowcaseCaption(
  input: GenerateShowcaseCaptionInput,
  origin: string
) {
  const dataUrl = await imageUrlToDataUrl(input.imageUrl, origin);
  const openai = createOpenAiClient();
  const model = resolveOpenAiChatModel();

  const completion = await runAiChatCompletion(
    openai,
    {
      model,
      messages: [
        {
          role: "system",
          content: SHOWCASE_CAPTION_SINGLE_IMAGE.systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                context: input.context,
                instruction:
                  "Write one showcase caption that accurately describes this photograph for a hero card on the studio website.",
              }),
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    },
    {
      taskType: "showcase_caption.single_image",
      promptId: SHOWCASE_CAPTION_SINGLE_IMAGE.id,
      promptVersion: SHOWCASE_CAPTION_SINGLE_IMAGE.version,
      projectId: null,
      createdBy: "admin",
      inputSummary: {
        hasImageUrl: true,
        pageTitle: input.context.pageTitle ?? null,
      },
    }
  );

  const caption = normalizeCaption(completion.choices[0]?.message?.content ?? "");
  if (!caption) {
    throw new Error("AI did not return a caption.");
  }
  return { caption };
}
