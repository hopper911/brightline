import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import {
  generateProjectCopy,
  parseProjectCopyRequest,
} from "@/lib/ai/generateProjectCopy";
import { safeAiClientError } from "@/lib/ai/safe-client-error";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      {
        ok: false,
        error: "Admin session expired. Please log in again at /admin/login.",
        code: "admin_session",
      },
      { status: 401 }
    );
  }

  const ip = getClientIp(req);
  if (
    await isRateLimitedAsync(ip, {
      scope: "ai-project-copy",
      max: 30,
      windowMs: 60 * 60_000,
    })
  ) {
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
    const candidateId =
      parsed.data.projectId && parsed.data.projectId !== "new"
        ? parsed.data.projectId
        : null;
    if (candidateId) {
      const workProject = await prisma.workProject.findUnique({
        where: { id: candidateId },
        select: { id: true },
      });
      if (workProject) {
        await prisma.aiGeneration
          .create({
            data: {
              projectId: workProject.id,
              fieldKey: "fieldKey" in parsed.data ? parsed.data.fieldKey : parsed.data.mode,
              generationType:
                parsed.data.mode === "brief_case_study" ? "case_study" : "project_copy",
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
          })
          .catch((err) => console.error("AI_GENERATION_SAVE_ERROR", err));
      }
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("PROJECT_GENERATE_COPY_ERROR", err);
    const safe = safeAiClientError(err);
    return NextResponse.json(
      { ok: false, error: safe.error, ...(safe.code ? { code: safe.code } : {}) },
      { status: safe.status }
    );
  }
}
