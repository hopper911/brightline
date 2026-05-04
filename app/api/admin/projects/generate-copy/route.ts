import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
import {
  generateProjectCopy,
  parseProjectCopyRequest,
} from "@/lib/ai/generateProjectCopy";
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
      { ok: false, error: "Too many AI generation requests. Try again shortly." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseProjectCopyRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: parsed.status }
    );
  }

  try {
    const result = await generateProjectCopy(parsed.data);
    if (parsed.data.projectId && parsed.data.projectId !== "new") {
      await prisma.aiGeneration.create({
        data: {
          projectId: parsed.data.projectId,
          fieldKey: "fieldKey" in parsed.data ? parsed.data.fieldKey : parsed.data.mode,
          generationType: parsed.data.mode === "brief_case_study" ? "case_study" : "project_copy",
          promptMode: parsed.data.mode,
          tonePreset: "tonePreset" in parsed.data ? parsed.data.tonePreset : undefined,
          inputBrief: {
            brief: parsed.data.brief,
            existingValues: parsed.data.existingValues,
            sourceText: "sourceText" in parsed.data ? parsed.data.sourceText : undefined,
          },
          outputText: "value" in result ? result.value : undefined,
          outputJSON: result,
          modelUsed: process.env.OPENAI_MODEL || "gpt-4o-mini",
          createdBy: "admin",
        },
      }).catch((err) => console.error("AI_GENERATION_SAVE_ERROR", err));
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI generation failed.";
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

