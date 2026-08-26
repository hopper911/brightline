import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { fetchPublicImageAsDataUrl } from "@/lib/fetch-public-image";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseImageAnalysisBody(body: unknown):
  | { ok: true; imageUrls: string[]; briefNotes: string }
  | { ok: false; error: string; status: number } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object.", status: 400 };
  }

  const input = body as Record<string, unknown>;
  const imageUrls = Array.isArray(input.imageUrls)
    ? input.imageUrls
        .map((url) => (typeof url === "string" ? url.trim() : ""))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  if (imageUrls.length === 0) {
    return { ok: false, error: "imageUrls[] is required.", status: 400 };
  }

  return {
    ok: true,
    imageUrls,
    briefNotes:
      typeof input.briefNotes === "string" ? input.briefNotes.trim() : "",
  };
}

function openAiStatus(err: unknown): number {
  if (err instanceof APIError) {
    if (err.status === 429) return 429;
    if (err.status === 408) return 504;
    if (err.status === 401 || err.status === 403) return 502;
  }
  return 502;
}

function parseImageNotes(raw: unknown): string[] {
  if (!raw || typeof raw !== "object" || !("imageNotes" in raw)) return [];
  const notes = (raw as { imageNotes?: unknown }).imageNotes;
  if (!Array.isArray(notes)) return [];
  return notes
    .map((note) => (typeof note === "string" ? note.trim() : ""))
    .filter(Boolean)
    .slice(0, 24);
}

export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  if (
    await isRateLimitedAsync(getClientIp(req), {
      scope: "projects-analyze-images",
      max: 30,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseImageAnalysisBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status }
    );
  }

  const origin = new URL(req.url).origin;
  let dataUrls: string[];
  try {
    dataUrls = await Promise.all(
      parsed.imageUrls.map((url) =>
        fetchPublicImageAsDataUrl(url, origin, { maxBytes: 8 * 1024 * 1024 })
      )
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Could not load one or more images.",
      },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze photography project images for Bright Line Photography. Return JSON only with imageNotes as concise visual observations. Describe only visible content: subject, space type, materials, lighting, composition, commercial use, architectural details, and brand/storytelling opportunities. Do not identify people by name. Do not invent client details.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Brief notes: ${parsed.briefNotes || "None provided."}`,
            },
            ...dataUrls.map((url) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ],
        },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "{}";
    let raw: unknown;
    try {
      raw = JSON.parse(text);
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

    return NextResponse.json({ imageNotes: parseImageNotes(raw) });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "OpenAI image analysis failed.",
      },
      { status: openAiStatus(err) }
    );
  }
}
