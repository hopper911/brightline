import { BLOG_POST_ASSIST } from "@/lib/ai/prompts";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";

export type BlogAssistAction = "suggest" | "polish" | "fix" | "excerpt" | "seo";

export type BlogPostDraft = {
  title?: string;
  excerpt?: string;
  body?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
};

export type BlogSuggestResult = {
  suggestions: string[];
  improvedTitle?: string;
  improvedExcerpt?: string;
  improvedBody?: string;
  improvedSeoTitle?: string;
  improvedSeoDescription?: string;
  suggestedTags?: string[];
};

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function stringList(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);
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

function truncate(value: string, max: number) {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd();
}

export function parseBlogAssistInput(body: unknown):
  | { ok: true; data: { action: BlogAssistAction; draft: BlogPostDraft } }
  | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const obj = body as Record<string, unknown>;
  const action = obj.action;
  if (
    action !== "suggest" &&
    action !== "polish" &&
    action !== "fix" &&
    action !== "excerpt" &&
    action !== "seo"
  ) {
    return { ok: false, status: 400, error: "Invalid action." };
  }
  const rawDraft =
    obj.draft && typeof obj.draft === "object" && !Array.isArray(obj.draft)
      ? (obj.draft as Record<string, unknown>)
      : {};

  return {
    ok: true,
    data: {
      action,
      draft: {
        title: cleanString(rawDraft.title),
        excerpt: cleanString(rawDraft.excerpt),
        body: cleanString(rawDraft.body),
        tags: stringList(rawDraft.tags, 12),
        seoTitle: cleanString(rawDraft.seoTitle),
        seoDescription: cleanString(rawDraft.seoDescription),
      },
    },
  };
}

function actionInstructions(action: BlogAssistAction) {
  switch (action) {
    case "suggest":
      return {
        task: "Review the draft and suggest concrete improvements.",
        responseShape: {
          suggestions: ["Short actionable bullet points"],
          improvedTitle: "Optional stronger title",
          improvedExcerpt: "Optional improved excerpt",
          improvedBody: "Optional improved body when clearly better",
          improvedSeoTitle: "Optional SEO title under 60 chars",
          improvedSeoDescription: "Optional meta description ~140-160 chars",
          suggestedTags: ["tag1", "tag2"],
        },
      };
    case "polish":
      return {
        task: "Rewrite the body for clarity, rhythm, and Bright Line editorial voice. Keep facts and meaning; improve flow.",
        responseShape: { body: "Polished full body text with paragraph breaks." },
      };
    case "fix":
      return {
        task: "Fix grammar, spelling, and awkward phrasing with minimal changes. Do not restructure unless necessary.",
        responseShape: { body: "Corrected body text." },
      };
    case "excerpt":
      return {
        task: "Write a compelling 1-2 sentence excerpt for the blog index card.",
        responseShape: { excerpt: "Short excerpt, roughly 120-220 characters." },
      };
    case "seo":
      return {
        task: "Write SEO title and meta description for this post.",
        responseShape: {
          seoTitle: "Under 60 characters when possible",
          seoDescription: "Around 140-160 characters",
        },
      };
  }
}

export async function generateBlogPostAssist(
  action: BlogAssistAction,
  draft: BlogPostDraft
): Promise<Record<string, unknown>> {
  if (!draft.body?.trim() && action !== "suggest" && action !== "seo") {
    throw Object.assign(new Error("Add some body copy before using AI assist."), { status: 400 });
  }

  const openai = createOpenAiClient();
  const model = resolveOpenAiChatModel();
  const instructions = actionInstructions(action);

  const completion = await runAiChatCompletion(
    openai,
    {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BLOG_POST_ASSIST.systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            action,
            ...instructions,
            draft,
          }),
        },
      ],
    },
    {
      taskType: `blog_post.${action}`,
      promptId: BLOG_POST_ASSIST.id,
      promptVersion: BLOG_POST_ASSIST.version,
      projectId: null,
      createdBy: "admin",
      inputSummary: { action, hasBody: !!draft.body?.trim() },
    }
  );

  const raw = parseJsonObject(completion.choices[0]?.message?.content ?? "");

  if (action === "suggest") {
    const result: BlogSuggestResult = {
      suggestions: stringList(raw.suggestions, 10),
      ...(cleanString(raw.improvedTitle) ? { improvedTitle: truncate(cleanString(raw.improvedTitle)!, 120) } : {}),
      ...(cleanString(raw.improvedExcerpt) ? { improvedExcerpt: truncate(cleanString(raw.improvedExcerpt)!, 280) } : {}),
      ...(cleanString(raw.improvedBody) ? { improvedBody: cleanString(raw.improvedBody) } : {}),
      ...(cleanString(raw.improvedSeoTitle) ? { improvedSeoTitle: truncate(cleanString(raw.improvedSeoTitle)!, 70) } : {}),
      ...(cleanString(raw.improvedSeoDescription)
        ? { improvedSeoDescription: truncate(cleanString(raw.improvedSeoDescription)!, 180) }
        : {}),
      ...(stringList(raw.suggestedTags, 12).length ? { suggestedTags: stringList(raw.suggestedTags, 12) } : {}),
    };
    return result;
  }

  if (action === "polish" || action === "fix") {
    const body = cleanString(raw.body);
    if (!body) throw new Error("AI did not return revised body text.");
    return { body };
  }

  if (action === "excerpt") {
    const excerpt = cleanString(raw.excerpt);
    if (!excerpt) throw new Error("AI did not return an excerpt.");
    return { excerpt: truncate(excerpt, 280) };
  }

  const seoTitle = cleanString(raw.seoTitle);
  const seoDescription = cleanString(raw.seoDescription);
  if (!seoTitle && !seoDescription) {
    throw new Error("AI did not return SEO fields.");
  }
  return {
    ...(seoTitle ? { seoTitle: truncate(seoTitle, 70) } : {}),
    ...(seoDescription ? { seoDescription: truncate(seoDescription, 180) } : {}),
  };
}
