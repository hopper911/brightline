import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import { generateDeliveryRecommendations } from "@/lib/ai/generateDeliveryRecommendations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (isRateLimited(getClientIp(req))) {
    return NextResponse.json({ ok: false, error: "Too many delivery recommendation requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const obj = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const projectId = typeof obj.projectId === "string" ? obj.projectId.trim() : "";
  const images = Array.isArray(obj.images) ? obj.images : [];
  if (!projectId || images.length === 0) {
    return NextResponse.json({ ok: false, error: "projectId and images are required." }, { status: 400 });
  }

  try {
    const origin = new URL(req.url).origin;
    const result = await generateDeliveryRecommendations({
      projectId,
      projectContext:
        obj.projectContext && typeof obj.projectContext === "object" && !Array.isArray(obj.projectContext)
          ? (obj.projectContext as Record<string, unknown>)
          : {},
      images: images
        .map((image) => (image && typeof image === "object" ? (image as Record<string, unknown>) : null))
        .filter((image): image is Record<string, unknown> => Boolean(image))
        .map((image) => ({
          id: typeof image.id === "string" ? image.id : "",
          url: typeof image.url === "string" ? new URL(image.url, origin).toString() : "",
          filename: typeof image.filename === "string" ? image.filename : undefined,
          existingAltText: typeof image.existingAltText === "string" ? image.existingAltText : undefined,
          existingCaption: typeof image.existingCaption === "string" ? image.existingCaption : undefined,
        }))
        .filter((image) => image.id && image.url),
    });
    const projectContext =
      obj.projectContext && typeof obj.projectContext === "object" && !Array.isArray(obj.projectContext)
        ? (JSON.parse(JSON.stringify(obj.projectContext)) as Prisma.InputJsonObject)
        : {};
    await prisma.aiGeneration.create({
      data: {
        projectId,
        fieldKey: "deliveryRecommendations",
        generationType: "delivery_recommendation",
        promptMode: "project_delivery",
        inputBrief: {
          projectContext:
            projectContext,
          imageCount: images.length,
        },
        outputJSON: result,
        modelUsed: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        createdBy: "admin",
      },
    }).catch((err) => console.error("AI_DELIVERY_GENERATION_SAVE_ERROR", err));
    return NextResponse.json(result);
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number" ? err.status : 502;
    const message = err instanceof Error ? err.message : "Delivery recommendations failed.";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

