import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import {
  buildGenerateCopyUserPayload,
  GENERATE_COPY_SYSTEM,
  normalizeGeneratedProject,
  parseGenerateCopyInput,
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
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
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
        {
          ok: false,
          error: "Model returned invalid JSON.",
          ...(process.env.NODE_ENV === "development" ? { rawResponse: text } : {}),
        },
        { status: 502 }
      );
    }

    const result = normalizeGeneratedProject(raw, parsed.data);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: safeClientMessage(err),
      },
      { status: openAiStatus(err) }
    );
  }
}
