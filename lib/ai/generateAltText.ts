import { ALT_TEXT_SINGLE_IMAGE } from "@/lib/ai/prompts";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";

export type AltTextProjectContext = {
  clientName?: string;
  projectTitle?: string;
  pillar?: string;
  location?: string;
  whatWasPhotographed?: string;
  visualApproach?: string;
};

export type GenerateAltTextInput = {
  imageUrl: string;
  projectContext: AltTextProjectContext;
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function truncate(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd();
}

export function parseGenerateAltTextInput(body: unknown):
  | { ok: true; data: GenerateAltTextInput }
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
    obj.projectContext && typeof obj.projectContext === "object" && !Array.isArray(obj.projectContext)
      ? (obj.projectContext as Record<string, unknown>)
      : {};

  return {
    ok: true,
    data: {
      imageUrl,
      projectContext: {
        clientName: cleanString(rawContext.clientName),
        projectTitle: cleanString(rawContext.projectTitle),
        pillar: cleanString(rawContext.pillar),
        location: cleanString(rawContext.location),
        whatWasPhotographed: cleanString(rawContext.whatWasPhotographed),
        visualApproach: cleanString(rawContext.visualApproach),
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
    throw Object.assign(new Error(`Could not load image for alt text (${res.status}).`), {
      status: 400,
    });
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw Object.assign(new Error("imageUrl must point to an image."), { status: 400 });
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength > 8 * 1024 * 1024) {
    throw Object.assign(new Error("Image is too large for AI alt text generation."), { status: 400 });
  }
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

function normalizeAltText(raw: string) {
  return truncate(
    raw
      .replace(/^["']|["']$/g, "")
      .replace(/\b(image|photo|picture) of\b/gi, "")
      .replace(/\s+/g, " ")
      .trim(),
    125
  );
}

export async function generateAltText(
  input: GenerateAltTextInput,
  origin: string,
  opsContext?: { projectId?: string; createdBy?: string }
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
          content: ALT_TEXT_SINGLE_IMAGE.systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                projectContext: input.projectContext,
                instruction: "Generate one accessible alt text string for this image.",
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
      taskType: "alt_text.single_image",
      promptId: ALT_TEXT_SINGLE_IMAGE.id,
      promptVersion: ALT_TEXT_SINGLE_IMAGE.version,
      projectId: opsContext?.projectId ?? null,
      createdBy: opsContext?.createdBy ?? "admin",
      inputSummary: {
        hasImageUrl: true,
        hasClient: !!input.projectContext.clientName,
        hasTitle: !!input.projectContext.projectTitle,
      },
    }
  );

  const altText = normalizeAltText(completion.choices[0]?.message?.content ?? "");
  if (!altText) {
    throw new Error("AI did not return alt text.");
  }
  return { altText };
}

