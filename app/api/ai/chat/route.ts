import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import { createOpenAiClient, resolveOpenAiChatModel, runChatCompletion, type ChatCompletionBody } from "@/lib/ai/runtime";
import { safeAiClientError } from "@/lib/ai/safe-client-error";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 12_000;
const MAX_TOTAL_CHARS = 48_000;

function contentCharCount(content: unknown): number {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  let total = 0;
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const text = (part as { text?: unknown }).text;
    if (typeof text === "string") total += text.length;
    const imageUrl = (part as { image_url?: { url?: unknown } }).image_url?.url;
    if (typeof imageUrl === "string") total += Math.min(imageUrl.length, 200_000);
  }
  return total;
}

/**
 * Thin manual trigger for chat completions (Mission Control / admin only).
 * Prefer domain-specific routes when they exist; this is a generic escape hatch.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  if (
    await isRateLimitedAsync(getClientIp(req), {
      scope: "ai-chat",
      max: 40,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many AI chat requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Body must be a JSON object." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ ok: false, error: "messages[] is required." }, { status: 400 });
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ ok: false, error: "Too many messages." }, { status: 400 });
  }

  let totalChars = 0;
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    const content = (msg as { content?: unknown }).content;
    const chars = contentCharCount(content);
    if (chars > MAX_CHARS_PER_MESSAGE) {
      return NextResponse.json(
        { ok: false, error: "A message exceeds the maximum allowed size." },
        { status: 400 }
      );
    }
    totalChars += chars;

    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const imageUrl = (part as { image_url?: { url?: unknown } }).image_url?.url;
      if (typeof imageUrl === "string" && imageUrl.trim() && !imageUrl.trim().startsWith("data:")) {
        return NextResponse.json(
          {
            ok: false,
            error: "Remote image_url is not allowed on this endpoint. Use data: URLs or domain routes.",
          },
          { status: 400 }
        );
      }
    }
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    return NextResponse.json(
      { ok: false, error: "Total message payload is too large." },
      { status: 400 }
    );
  }

  try {
    const client = createOpenAiClient();
    const payload: ChatCompletionBody = {
      model: resolveOpenAiChatModel(),
      messages: messages as ChatCompletionBody["messages"],
    };
    const completion = await runChatCompletion(client, payload);
    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, text, model: completion.model });
  } catch (e: unknown) {
    console.error("AI_CHAT_ERROR", e);
    const safe = safeAiClientError(e, "AI request failed.");
    return NextResponse.json({ ok: false, error: safe.error }, { status: safe.status });
  }
}
