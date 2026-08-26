import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { parseSeoCheckInput, seoCheckProject } from "@/lib/ai/seoCheckProject";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many SEO check requests. Try again shortly." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseSeoCheckInput(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status }
    );
  }

  try {
    const result = await seoCheckProject(parsed.data);
    const projectId =
      body && typeof body === "object" && !Array.isArray(body) && typeof (body as { projectId?: unknown }).projectId === "string"
        ? (body as { projectId: string }).projectId.trim()
        : "";
    if (projectId) {
      await prisma.aiGeneration.create({
        data: {
          projectId,
          fieldKey: "seo",
          generationType: "seo",
          promptMode: "seo_check",
          inputBrief: parsed.data,
          outputJSON: result,
          modelUsed: process.env.OPENAI_MODEL || "gpt-4o-mini",
          createdBy: "admin",
        },
      }).catch((err) => console.error("AI_SEO_GENERATION_SAVE_ERROR", err));
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI SEO check failed.";
    const status =
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : 502;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

