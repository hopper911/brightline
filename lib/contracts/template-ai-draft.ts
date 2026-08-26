import { DocumentTemplateType } from "@prisma/client";
import { z } from "zod";
import {
  createOpenAiClient,
  resolveOpenAiChatModel,
  runChatCompletion,
  type ChatCompletionBody,
} from "@/lib/ai/runtime";

const BASE_SYSTEM_RULES = `You help draft contract-style HTML templates for a photography studio.
Output ONLY raw HTML fragments (no markdown, no \`\`\` fences). Use semantic tags where appropriate (e.g. p, h2, ul, li).
Preserve placeholder tokens exactly like {{clientName}} — do not remove or rename them.
Do not claim legal validity; the operator must review and approve all text before use.`;

export const templateAiDraftRequestSchema = z
  .object({
    genAiEnabled: z.boolean(),
    genAiSystemPrompt: z.string().max(50000).nullable().optional(),
    genAiUserPrompt: z.string().max(50000).nullable().optional(),
    genAiModel: z.string().max(200).nullable().optional(),
    title: z.string().min(1).max(500),
    type: z.nativeEnum(DocumentTemplateType),
    contentHtml: z.string().max(500_000).default(""),
    operatorMessage: z.string().max(10_000).nullable().optional(),
    mode: z.enum(["replace", "refine"]).default("refine"),
  })
  .superRefine((val, ctx) => {
    if (!val.genAiEnabled) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "AI assist must be enabled." });
    }
    const sys = (val.genAiSystemPrompt ?? "").trim();
    const usr = (val.genAiUserPrompt ?? "").trim();
    if (!sys && !usr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one of system/style rules or default operator prompt.",
      });
    }
  });

export type TemplateAiDraftRequest = z.infer<typeof templateAiDraftRequestSchema>;

export function normalizeTemplateAiModel(model: string | null | undefined): string {
  const trimmed = (model ?? "").trim();
  if (!trimmed) return resolveOpenAiChatModel();
  const noOpenAiPrefix = trimmed.replace(/^openai\//i, "");
  return noOpenAiPrefix || resolveOpenAiChatModel();
}

export function buildTemplateAiMessages(input: TemplateAiDraftRequest): ChatCompletionBody["messages"] {
  const systemParts = [BASE_SYSTEM_RULES];
  const customSystem = (input.genAiSystemPrompt ?? "").trim();
  if (customSystem) systemParts.push(customSystem);

  const userParts: string[] = [];
  userParts.push(`Template title: ${input.title}`);
  userParts.push(`Template type: ${input.type}`);
  const defaultUser = (input.genAiUserPrompt ?? "").trim();
  if (defaultUser) userParts.push(`Template instructions:\n${defaultUser}`);
  const op = (input.operatorMessage ?? "").trim();
  if (op) userParts.push(`Additional instructions for this run:\n${op}`);

  if (input.mode === "refine") {
    userParts.push(
      `Current HTML body (revise and improve per instructions; keep placeholders):\n${input.contentHtml || "(empty)"}`
    );
  } else {
    userParts.push(
      "Generate a fresh HTML body from scratch (still follow the instructions and placeholders guidance). Ignore prior HTML."
    );
  }

  return [
    { role: "system" as const, content: systemParts.join("\n\n") },
    { role: "user" as const, content: userParts.join("\n\n") },
  ];
}

/** Strip accidental markdown code fences from model output. */
export function stripHtmlFences(text: string): string {
  let t = text.trim();
  const fence = /^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/im;
  const m = t.match(fence);
  if (m?.[1]) t = m[1].trim();
  return t;
}

export async function generateContractTemplateHtml(
  input: TemplateAiDraftRequest
): Promise<{ html: string; model: string }> {
  const model = normalizeTemplateAiModel(input.genAiModel);
  const client = createOpenAiClient();
  const messages = buildTemplateAiMessages(input);
  const completion = await runChatCompletion(client, {
    model,
    messages,
    temperature: 0.6,
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const html = stripHtmlFences(typeof raw === "string" ? raw : "");
  if (!html.trim()) {
    throw Object.assign(new Error("The model returned empty content."), { status: 502 });
  }
  return { html, model: completion.model ?? model };
}

export function parseTemplateAiDraftBody(body: unknown):
  | { ok: true; data: TemplateAiDraftRequest }
  | { ok: false; error: string; status: number } {
  const parsed = templateAiDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().formErrors[0] ?? "Validation failed.";
    return { ok: false, error: first, status: 400 };
  }
  return { ok: true, data: parsed.data };
}
