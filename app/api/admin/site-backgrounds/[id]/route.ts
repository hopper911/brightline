import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  setActiveBackgroundVideo,
  clearActiveBackgroundVideo,
  slugifyBackgroundVideoTitle,
} from "@/lib/site-background-videos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const video = await prisma.siteBackgroundVideo.findUnique({ where: { id } });
  if (!video) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, video });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await prisma.siteBackgroundVideo.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  let slug = existing.slug;
  if (typeof body.slug === "string" && body.slug.trim()) {
    slug = slugifyBackgroundVideoTitle(body.slug) || existing.slug;
    if (slug !== existing.slug) {
      const clash = await prisma.siteBackgroundVideo.findUnique({ where: { slug } });
      if (clash) {
        return NextResponse.json({ ok: false, error: "Slug already in use." }, { status: 409 });
      }
    }
  }

  const video = await prisma.siteBackgroundVideo.update({
    where: { id },
    data: {
      title:
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim()
          : undefined,
      slug,
      storageKey:
        typeof body.storageKey === "string" && body.storageKey.trim()
          ? body.storageKey.trim().replace(/^\/+/, "")
          : undefined,
      webStorageKey:
        body.webStorageKey === null
          ? null
          : typeof body.webStorageKey === "string"
            ? body.webStorageKey.trim().replace(/^\/+/, "") || null
            : undefined,
      posterKey:
        body.posterKey === null
          ? null
          : typeof body.posterKey === "string"
            ? body.posterKey.trim().replace(/^\/+/, "") || null
            : undefined,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.round(body.sortOrder)
          : undefined,
      width:
        body.width === null
          ? null
          : typeof body.width === "number"
            ? Math.round(body.width)
            : undefined,
      height:
        body.height === null
          ? null
          : typeof body.height === "number"
            ? Math.round(body.height)
            : undefined,
      bytes:
        body.bytes === null
          ? null
          : typeof body.bytes === "number"
            ? Math.round(body.bytes)
            : undefined,
      durationSec:
        body.durationSec === null
          ? null
          : typeof body.durationSec === "number"
            ? Math.round(body.durationSec)
            : undefined,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
    },
  });

  if (body.isActive === true) {
    await setActiveBackgroundVideo(id);
  } else if (body.isActive === false && existing.isActive) {
    await clearActiveBackgroundVideo();
  }

  const refreshed = await prisma.siteBackgroundVideo.findUnique({ where: { id } });
  return NextResponse.json({ ok: true, video: refreshed ?? video });
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await prisma.siteBackgroundVideo.delete({ where: { id } });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
