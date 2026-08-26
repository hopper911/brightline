import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  SITE_BACKGROUNDS_PREFIX,
  setActiveBackgroundVideo,
  slugifyBackgroundVideoTitle,
} from "@/lib/site-background-videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const videos = await prisma.siteBackgroundVideo.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    return NextResponse.json({
      ok: true,
      videos,
      prefix: SITE_BACKGROUNDS_PREFIX,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load background catalog.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const storageKey = typeof body.storageKey === "string" ? body.storageKey.trim().replace(/^\/+/, "") : "";
  if (!title || !storageKey) {
    return NextResponse.json(
      { ok: false, error: "title and storageKey are required." },
      { status: 400 }
    );
  }

  let slug =
    typeof body.slug === "string" && body.slug.trim()
      ? slugifyBackgroundVideoTitle(body.slug)
      : slugifyBackgroundVideoTitle(title);
  if (!slug) slug = `bg-${Date.now()}`;

  const existing = await prisma.siteBackgroundVideo.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Slug already in use." }, { status: 409 });
  }

  const makeActive = body.isActive === true;

  const video = await prisma.siteBackgroundVideo.create({
    data: {
      title,
      slug,
      storageKey,
      webStorageKey:
        typeof body.webStorageKey === "string" && body.webStorageKey.trim()
          ? body.webStorageKey.trim().replace(/^\/+/, "")
          : null,
      posterKey:
        typeof body.posterKey === "string" && body.posterKey.trim()
          ? body.posterKey.trim().replace(/^\/+/, "")
          : null,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.round(body.sortOrder)
          : 0,
      width: typeof body.width === "number" ? Math.round(body.width) : null,
      height: typeof body.height === "number" ? Math.round(body.height) : null,
      bytes: typeof body.bytes === "number" ? Math.round(body.bytes) : null,
      durationSec: typeof body.durationSec === "number" ? Math.round(body.durationSec) : null,
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      isActive: false,
    },
  });

  if (makeActive) {
    await setActiveBackgroundVideo(video.id);
    const refreshed = await prisma.siteBackgroundVideo.findUnique({ where: { id: video.id } });
    return NextResponse.json({ ok: true, video: refreshed });
  }

  return NextResponse.json({ ok: true, video });
}
