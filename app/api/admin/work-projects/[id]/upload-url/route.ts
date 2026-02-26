import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getMarketingUploadUrl } from "@/lib/image-strategy";
import { SECTION_TO_PILLAR } from "@/lib/portfolioPillars";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id: projectId } = await context.params;

    const project = await prisma.workProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    let body: { filename?: string; contentType?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    if (!body.filename?.trim()) {
      return NextResponse.json({ ok: false, error: "filename is required." }, { status: 400 });
    }

    const pillarSlug = SECTION_TO_PILLAR[project.section];
    const safeName = body.filename.replace(/[^\w.-]/g, "-");
    const key = `work/${pillarSlug}/${projectId}/${Date.now()}-${safeName}`;
    const signed = await getMarketingUploadUrl({
      key,
      contentType: body.contentType || "image/jpeg",
    });

    return NextResponse.json({ ok: true, url: signed.url, key });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_UPLOAD_URL_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to get upload URL.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
