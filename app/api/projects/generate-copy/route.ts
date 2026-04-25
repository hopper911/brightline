import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import {
  buildGenerateCopyUserPayload,
  GENERATE_COPY_SYSTEM,
  generateLocalProjectCopy,
  parseGenerateCopyInput,
  parseGenerateCopyModelJson,
  type GenerateCopyResult,
} from "@/lib/studio/generate-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type { GenerateCopyResult };

function openAiStatus(err: unknown): number {
  if (err instanceof APIError) {
    if (err.status === 429) return 429;
    if (err.status === 408) return 504;
    if (err.status === 401 || err.status === 403) return 502;
  }
  return 502;
}

function safeClientMessage(err: unknown): string {
  if (err instanceof APIError) {
    if (err.status === 429) return "Rate limited by the model provider. Try again shortly.";
    if (err.status === 408) return "The model request timed out.";
    if (err.status === 401 || err.status === 403) return "Model provider rejected credentials.";
  }
  return err instanceof Error ? err.message : "OpenAI request failed.";
}

export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseGenerateCopyInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  if (!apiKey) {
    const result = generateLocalProjectCopy(parsed.data);
    return NextResponse.json({
      ok: true,
      ...result,
      provider: "local-template",
      warning: "OPENAI_API_KEY is not configured, so Studio OS used the built-in copy generator.",
    });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });
  const userPayload = buildGenerateCopyUserPayload(parsed.data);

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GENERATE_COPY_SYSTEM },
        {
          role: "user",
          content: `Write project copy from this input:\n${userPayload}`,
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Model returned invalid JSON." },
        { status: 502 }
      );
    }

    const result = parseGenerateCopyModelJson(raw);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const result = generateLocalProjectCopy(parsed.data);
    return NextResponse.json({
      ok: true,
      ...result,
      provider: "local-template",
      warning: safeClientMessage(err),
      providerStatus: openAiStatus(err),
    });
  }
}
