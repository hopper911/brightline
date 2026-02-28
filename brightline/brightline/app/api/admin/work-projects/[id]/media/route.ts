import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

const IMAGE_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;
const PORTFOLIO_PATTERN = /^portfolio\/(arc|cam|cor)\/web_full\/[^/]+$/;
const WORK_PATTERN = /^work\/(arc|cam|cor)\/[^/]+\/[^/]+$/;

function validateR2Key(key: string): string | null {
  const k = key.replace(/^\/+/, "").trim();
  if (!k) return "R2 key cannot be empty.";
  if (!IMAGE_EXT.test(k)) {
    return "R2 key must include a file extension (e.g. .jpg, .webp) and match portfolio/arc|cam|cor/web_full/ or work/...";
  }
  const portfolioMatch = k.match(PORTFOLIO_PATTERN);
  const workMatch = k.match(WORK_PATTERN);
  if (!portfolioMatch && !workMatch) {
    return "R2 key must match portfolio/arc|cam|cor/web_full/{filename}.{ext} or work/arc|cam|cor/{projectId}/{filename}.{ext}";
  }
  return null;
}

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

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

    let body: {
      keyFull?: string;
      keyThumb?: string;
      alt?: string;
      keys?: string[];
      video?: { providerId?: string; url?: string; posterKey?: string; alt?: string };
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    let sortOrder = (project.media[0]?.sortOrder ?? -1) + 1;

    if (body.video) {
      const vid = body.video;
      const providerId = vid.providerId?.trim() || (vid.url ? extractYouTubeId(vid.url) : null);
      if (!providerId) {
        return NextResponse.json(
          { ok: false, error: "video.providerId or video.url (YouTube) is required." },
          { status: 400 }
        );
      }
      const media = await prisma.mediaAsset.create({
        data: {
          kind: "VIDEO",
          provider: "YOUTUBE",
          providerId,
          posterKey: vid.posterKey?.trim() || null,
          alt: vid.alt?.trim() || null,
        },
      });
      await prisma.projectMedia.create({
        data: { projectId, mediaId: media.id, sortOrder },
      });
      sortOrder += 1;
    }

    const keysToAdd: string[] = [];
    if (Array.isArray(body.keys) && body.keys.length > 0) {
      keysToAdd.push(
        ...body.keys
          .map((k) => (typeof k === "string" ? k.trim() : ""))
          .filter(Boolean)
      );
    } else if (body.keyFull?.trim()) {
      keysToAdd.push(body.keyFull.trim());
    }

    for (const key of keysToAdd) {
      const err = validateR2Key(key);
      if (err) {
        return NextResponse.json({ ok: false, error: err }, { status: 400 });
      }
    }

    const isBulk = keysToAdd.length > 1;
    for (const keyFull of keysToAdd) {
      const media = await prisma.mediaAsset.create({
        data: {
          kind: "IMAGE",
          keyFull,
          keyThumb: !isBulk && body.keyThumb?.trim() ? body.keyThumb.trim() : null,
          alt: !isBulk && body.alt?.trim() ? body.alt.trim() : null,
        },
      });
      await prisma.projectMedia.create({
        data: { projectId, mediaId: media.id, sortOrder },
      });
      sortOrder += 1;
    }

    if (keysToAdd.length === 0 && !body.video) {
      return NextResponse.json(
        { ok: false, error: "keyFull, keys array, or video is required." },
        { status: 400 }
      );
    }

    const updated = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({
      ok: true,
      project: updated,
      added: keysToAdd.length + (body.video ? 1 : 0),
    });
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
    const mediaIdsParam = url.searchParams.get("mediaIds");
    const idsToDelete: string[] = mediaIdsParam
      ? mediaIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : mediaId
        ? [mediaId]
        : [];

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { ok: false, error: "mediaId or mediaIds query param required." },
        { status: 400 }
      );
    }

    const project = await prisma.workProject.findUnique({
      where: { id: projectId },
      include: { heroMedia: true },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    await prisma.projectMedia.deleteMany({
      where: { projectId, mediaId: { in: idsToDelete } },
    });

    if (project.heroMediaId && idsToDelete.includes(project.heroMediaId)) {
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
