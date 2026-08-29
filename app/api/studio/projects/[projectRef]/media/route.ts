import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { isAsyncPublishAccepted } from "@/lib/platform/publishing/async-publish-types";
import { resolveStudioHubProjectPatch } from "@/lib/platform/publishing/integrations/studio-hub-publish";
import { canWriteStudioProject } from "@/lib/studio/access";
import { parseStudioProjectRefParam } from "@/lib/studio/projects/project-ref";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Brightline work-project media: hero assignment and explicit sort order. */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ projectRef: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const opsContext = await resolveStudioOpsContext(req);
  if (!opsContext) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { projectRef } = await context.params;
  const ref = parseStudioProjectRefParam(projectRef);
  if (!ref || ref.type !== "work-project") {
    return NextResponse.json({ ok: false, error: "Brightline work media only." }, { status: 400 });
  }

  const legacyAdmin = opsContext.subjectKind === "legacy_admin";
  if (!canWriteStudioProject("brightline", opsContext.permissions, legacyAdmin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    heroMediaId?: string | null;
    order?: Array<{ mediaId: string; sortOrder: number }>;
    heroImage?: string | null;
    thumbnailImage?: string | null;
    backgroundMedia?: string | null;
  } | null;

  if (ref.type === "work-project") {
    if (body?.heroMediaId !== undefined) {
      await prisma.workProject.update({
        where: { id: ref.id },
        data: { heroMediaId: body.heroMediaId || null },
      });
    }

    if (Array.isArray(body?.order)) {
      for (const item of body.order) {
        if (!item.mediaId || typeof item.sortOrder !== "number") continue;
        await prisma.projectMedia.updateMany({
          where: { projectId: ref.id, mediaId: item.mediaId },
          data: { sortOrder: item.sortOrder },
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (ref.type === "mirotech-case-study") {
    const payload: Record<string, unknown> = {};
    if (body?.heroImage !== undefined) payload.heroImage = body.heroImage || null;
    if (body?.thumbnailImage !== undefined) payload.thumbnailImage = body.thumbnailImage || null;
    if (body?.backgroundMedia !== undefined) payload.backgroundMedia = body.backgroundMedia || null;
    const result = await resolveStudioHubProjectPatch(ref.id, payload);
    if (isAsyncPublishAccepted(result)) {
      return NextResponse.json({ ok: true, jobId: result.jobId });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Unsupported project type." }, { status: 400 });
}
