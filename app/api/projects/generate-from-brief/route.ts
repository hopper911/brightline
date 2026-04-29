import { NextResponse } from "next/server";
import OpenAI, { APIError } from "openai";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import {
  buildGenerateCopyUserPayload,
  generatedProjectToStudioPayload,
  GENERATE_COPY_SYSTEM,
  normalizeGeneratedProject,
  parseGenerateCopyInput,
} from "@/lib/studio/generate-copy";
import {
  createStudioProjectRecord,
  updateStudioProjectRecord,
} from "@/lib/studio/studio-project-cms";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateFromBriefBody = {
  saveToDatabase?: boolean;
  projectId?: string;
};

function openAiStatus(err: unknown): number {
  if (err instanceof APIError) {
    if (err.status === 429) return 429;
    if (err.status === 408) return 504;
    if (err.status === 401 || err.status === 403) return 502;
  }
  return 502;
}

function imageUrlsFromBody(body: unknown): string[] {
  if (!body || typeof body !== "object" || !("imageUrls" in body)) return [];
  const urls = (body as { imageUrls?: unknown }).imageUrls;
  if (!Array.isArray(urls)) return [];
  return urls
    .map((url) => (typeof url === "string" ? url.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
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

async function analyzeImages(params: {
  openai: OpenAI;
  imageUrls: string[];
  briefNotes?: string;
}) {
  if (params.imageUrls.length === 0) return [];

  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";
  const completion = await params.openai.chat.completions.create({
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
            text: `Brief notes: ${params.briefNotes || "None provided."}`,
          },
          ...params.imageUrls.map((url) => ({
            type: "image_url" as const,
            image_url: { url },
          })),
        ],
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "{}";
  return parseImageNotes(JSON.parse(text) as unknown);
}

async function saveGeneratedProject(
  result: ReturnType<typeof normalizeGeneratedProject>,
  projectId?: string
) {
  const payload = generatedProjectToStudioPayload(result);
  if (projectId?.trim()) {
    const project = await updateStudioProjectRecord(projectId.trim(), payload);
    return { mode: "updated" as const, projectId: project.id };
  }

  const existing = await prisma.studioProject.findUnique({
    where: { slug: result.slug },
    select: { id: true },
  });

  if (existing) {
    const project = await updateStudioProjectRecord(existing.id, payload);
    return { mode: "updated" as const, projectId: project.id };
  }

  const project = await createStudioProjectRecord(payload);
  return { mode: "created" as const, projectId: project.id };
}

export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
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

  const parsed = parseGenerateCopyInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const saveToDatabase =
    body !== null &&
    typeof body === "object" &&
    Boolean((body as GenerateFromBriefBody).saveToDatabase);
  const projectId =
    body !== null && typeof body === "object"
      ? typeof (body as GenerateFromBriefBody).projectId === "string"
        ? (body as GenerateFromBriefBody).projectId
        : undefined
      : undefined;
  const openai = new OpenAI({ apiKey });
  const imageUrls = imageUrlsFromBody(body);
  let imageNotes = parsed.data.imageNotes ?? [];
  let imageWarning: string | undefined;

  if (imageUrls.length > 0 && imageNotes.length === 0) {
    try {
      imageNotes = await analyzeImages({
        openai,
        imageUrls,
        briefNotes: parsed.data.briefNotes ?? parsed.data.notes,
      });
    } catch (err) {
      imageWarning =
        err instanceof Error
          ? `Image analysis failed; generated from brief only. ${err.message}`
          : "Image analysis failed; generated from brief only.";
    }
  }

  const generatorInput = { ...parsed.data, imageUrls, imageNotes };
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GENERATE_COPY_SYSTEM },
        {
          role: "user",
          content: `Write project copy from this input:\n${buildGenerateCopyUserPayload(generatorInput)}`,
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

    const generated = normalizeGeneratedProject(raw, generatorInput);
    let saveMeta: { savedProjectId?: string; saveMode?: "created" | "updated"; warning?: string } = {};

    if (saveToDatabase) {
      try {
        const saved = await saveGeneratedProject(generated, projectId);
        saveMeta = { savedProjectId: saved.projectId, saveMode: saved.mode };
      } catch (err) {
        saveMeta = {
          warning:
            err instanceof Error
              ? `Database save failed: ${err.message}`
              : "Database save failed.",
        };
      }
    }

    return NextResponse.json({
      ...generated,
      ...(imageNotes.length ? { imageNotes } : {}),
      ...(imageWarning ? { warning: imageWarning } : {}),
      ...saveMeta,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "OpenAI request failed.",
      },
      { status: openAiStatus(err) }
    );
  }
}
