import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { generateAltText, parseGenerateAltTextInput } from "@/lib/ai/generateAltText";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many alt text generation requests. Try again shortly." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseGenerateAltTextInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  try {
    const origin = new URL(req.url).origin;
    const result = await generateAltText(parsed.data, origin);
    const obj = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    const projectId = typeof obj.projectId === "string" ? obj.projectId.trim() : "";
    if (projectId) {
      await prisma.aiGeneration.create({
        data: {
          projectId,
          fieldKey: typeof obj.mediaId === "string" ? obj.mediaId : "altText",
          generationType: "alt_text",
          promptMode: "single_image",
          inputBrief: parsed.data,
          outputText: result.altText,
          outputJSON: result,
          modelUsed: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
          createdBy: "admin",
        },
      }).catch((err) => console.error("AI_ALT_GENERATION_SAVE_ERROR", err));
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GENERATE_ALT_TEXT_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Failed to generate alt text.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

