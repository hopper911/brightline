import {
  SHOWCASE_CAPTION_SINGLE_IMAGE,
  SHOWCASE_LABEL_SINGLE_IMAGE,
  SHOWCASE_TITLE_SINGLE_IMAGE,
} from "@/lib/ai/prompts";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";

export type ShowcaseCaptionContext = {
  pageTitle?: string;
  cardTitle?: string;
  cardLabel?: string;
};

export type ShowcaseCopyField = "caption" | "label" | "title";

export type GenerateShowcaseCaptionInput = {
  imageUrl: string;
  field: ShowcaseCopyField;
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

function parseField(value: unknown): ShowcaseCopyField {
  if (value === "label" || value === "title" || value === "caption") return value;
  return "caption";
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
      field: parseField(obj.field),
      context: {
        pageTitle: cleanString(rawContext.pageTitle),
        cardTitle: cleanString(rawContext.cardTitle),
        cardLabel: cleanString(rawContext.cardLabel),
      },
    },
  };
}

async function imageUrlToDataUrl(imageUrl: string, origin: string) {
  const { trustedImageToDataUrl } = await import("@/lib/safe-fetch-image");
  return trustedImageToDataUrl(imageUrl, origin);
}

function normalizeText(raw: string, max: number) {
  return truncate(
    raw
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, " ")
      .trim(),
    max
  );
}

function fieldConfig(field: ShowcaseCopyField) {
  if (field === "label") {
    return {
      prompt: SHOWCASE_LABEL_SINGLE_IMAGE,
      maxLen: 64,
      instruction:
        "Write one showcase category label that fits this photograph for a hero card on the studio website.",
      taskType: "showcase_label.single_image" as const,
    };
  }
  if (field === "title") {
    return {
      prompt: SHOWCASE_TITLE_SINGLE_IMAGE,
      maxLen: 80,
      instruction:
        "Write one short showcase title/headline that fits this photograph for a hero card on the studio website.",
      taskType: "showcase_title.single_image" as const,
    };
  }
  return {
    prompt: SHOWCASE_CAPTION_SINGLE_IMAGE,
    maxLen: 240,
    instruction:
      "Write one showcase caption that accurately describes this photograph for a hero card on the studio website.",
    taskType: "showcase_caption.single_image" as const,
  };
}

export async function generateShowcaseCaption(
  input: GenerateShowcaseCaptionInput,
  origin: string
) {
  const dataUrl = await imageUrlToDataUrl(input.imageUrl, origin);
  const openai = createOpenAiClient();
  const model = resolveOpenAiChatModel();
  const config = fieldConfig(input.field);

  const completion = await runAiChatCompletion(
    openai,
    {
      model,
      messages: [
        {
          role: "system",
          content: config.prompt.systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                context: input.context,
                instruction: config.instruction,
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
      taskType: config.taskType,
      promptId: config.prompt.id,
      promptVersion: config.prompt.version,
      projectId: null,
      createdBy: "admin",
      inputSummary: {
        hasImageUrl: true,
        field: input.field,
        pageTitle: input.context.pageTitle ?? null,
      },
    }
  );

  const text = normalizeText(completion.choices[0]?.message?.content ?? "", config.maxLen);
  if (!text) {
    throw new Error(`AI did not return a ${input.field}.`);
  }

  if (input.field === "label") return { field: "label" as const, label: text, caption: text };
  if (input.field === "title") return { field: "title" as const, title: text, caption: text };
  return { field: "caption" as const, caption: text };
}
