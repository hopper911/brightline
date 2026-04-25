import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const { id: mediaId } = await context.params;

    const media = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: {
        projectMedia: {
          include: {
            project: { select: { id: true, title: true, slug: true, section: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!media) {
      return NextResponse.json({ ok: false, error: "Media not found." }, { status: 404 });
    }

    const projects = media.projectMedia.map((pm) => pm.project);
    return NextResponse.json({ ok: true, media, projects });
  } catch (err: unknown) {
    console.error("MEDIA_GET_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to load media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id: mediaId } = await context.params;
    const body = (await req.json()) as { alt?: string | null };

    const existing = await prisma.mediaAsset.findUnique({
      where: { id: mediaId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Media not found." }, { status: 404 });
    }

    const alt =
      body.alt === null || body.alt === undefined
        ? null
        : typeof body.alt === "string"
          ? body.alt.trim() || null
          : null;

    await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: { alt },
    });

    return NextResponse.json({ ok: true, alt });
  } catch (err: unknown) {
    console.error("MEDIA_PATCH_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to update media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
