import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { generateAltText, parseGenerateAltTextInput } from "@/lib/ai/generateAltText";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readRequestMeta(body: unknown) {
  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const projectId = typeof record.projectId === "string" ? record.projectId.trim() : "";
  const mediaId = typeof record.mediaId === "string" ? record.mediaId.trim() : "";
  return { projectId, mediaId };
}

export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return jsonErr("Too many alt text generation requests. Try again shortly.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const parsed = parseGenerateAltTextInput(raw.value);
  if (!parsed.ok) {
    return jsonErr(parsed.error, parsed.status);
  }

  const { projectId, mediaId } = readRequestMeta(raw.value);

  try {
    const origin = new URL(req.url).origin;
    const result = await generateAltText(parsed.data, origin, {
      projectId: projectId || undefined,
      createdBy: "admin",
    });
    if (projectId) {
      await prisma.aiGeneration
        .create({
          data: {
            projectId,
            fieldKey: mediaId || "altText",
            generationType: "alt_text",
            promptMode: "single_image",
            inputBrief: parsed.data,
            outputText: result.altText,
            outputJSON: result,
            modelUsed: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
            createdBy: "admin",
          },
        })
        .catch((err) => console.error("AI_ALT_GENERATION_SAVE_ERROR", err));
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GENERATE_ALT_TEXT_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Failed to generate alt text.";
    return jsonErr(message, status);
  }
}
