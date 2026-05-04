import OpenAI, { APIError } from "openai";

type PackageContentInput = {
  project: Record<string, unknown>;
  client: Record<string, unknown> | null;
  images: Array<Record<string, unknown>>;
};

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

async function runClientPackagePrompt(input: PackageContentInput, task: string, responseShape: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw Object.assign(new Error("AI content generation is not configured."), { status: 500 });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });
  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are the client strategy editor for BRIGHTLINE Photography. Write strategic, concise, premium marketing guidance. Avoid fluff and generic AI language. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task,
            project: input.project,
            client: input.client,
            selectedImages: input.images,
            positioning: "Bright Line delivers a ready-to-use visual system, not just a folder of images.",
            responseShape,
          }),
        },
      ],
    });
    return { json: parseJsonObject(completion.choices[0]?.message?.content ?? "{}"), model };
  } catch (err) {
    if (err instanceof APIError) throw Object.assign(new Error("AI client package content failed."), { status: 502 });
    throw err;
  }
}

export async function generateMarketingExport(input: PackageContentInput) {
  return runClientPackagePrompt(input, "Generate ready-to-copy client marketing content blocks from the delivered images.", {
    instagramCaptions: ["caption 1", "caption 2", "caption 3"],
    linkedInPost: "",
    websiteSectionCopy: "",
    listingDescription: "",
    emailCampaignCopy: "",
  });
}

export async function generateVisualStrategyReport(input: PackageContentInput) {
  return runClientPackagePrompt(input, "Generate a Visual Strategy Report for this completed project.", {
    overview: "",
    keyImages: [{ imageId: "", note: "" }],
    usageRecommendations: "",
    gapsInContent: "",
    suggestedNextShoot: "",
  });
}

