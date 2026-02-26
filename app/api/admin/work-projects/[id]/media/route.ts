import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";

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
      include: { media: { orderBy: { sortOrder: "desc" }, take: 1 } },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    let body: { keyFull: string; keyThumb?: string; alt?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    if (!body.keyFull?.trim()) {
      return NextResponse.json({ ok: false, error: "keyFull is required." }, { status: 400 });
    }

    const nextOrder = (project.media[0]?.sortOrder ?? -1) + 1;
    const media = await prisma.mediaAsset.create({
      data: {
        kind: "IMAGE",
        keyFull: body.keyFull.trim(),
        keyThumb: body.keyThumb?.trim() || null,
        alt: body.alt?.trim() || null,
      },
    });
    await prisma.projectMedia.create({
      data: { projectId, mediaId: media.id, sortOrder: nextOrder },
    });

    const updated = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({ ok: true, project: updated, media });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_MEDIA_POST_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to add media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id: projectId } = await context.params;

    const project = await prisma.workProject.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    let body: { mediaIds: string[] };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
    if (!Array.isArray(body.mediaIds)) {
      return NextResponse.json({ ok: false, error: "mediaIds must be an array." }, { status: 400 });
    }

    const links = await prisma.projectMedia.findMany({
      where: { projectId },
    });
    const linkByMediaId = new Map(links.map((l) => [l.mediaId, l]));
    const order = body.mediaIds.filter((mid) => linkByMediaId.has(mid));
    for (let i = 0; i < order.length; i++) {
      await prisma.projectMedia.updateMany({
        where: { projectId, mediaId: order[i] },
        data: { sortOrder: i },
      });
    }

    const updated = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({ ok: true, project: updated });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_MEDIA_PATCH_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to reorder media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id: projectId } = await context.params;
    const url = new URL(req.url);
    const mediaId = url.searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json({ ok: false, error: "mediaId query param required." }, { status: 400 });
    }

    const project = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: { heroMedia: true },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    await prisma.projectMedia.deleteMany({
      where: { projectId, mediaId },
    });

    if (project.heroMediaId === mediaId) {
      await prisma.workProject.update({
        where: { id: projectId },
        data: { heroMediaId: null },
      });
    }

    const updated = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({ ok: true, project: updated });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_MEDIA_DELETE_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to remove media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
