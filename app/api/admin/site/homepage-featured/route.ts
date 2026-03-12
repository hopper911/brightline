import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { setHomepageFeaturedMedia } from "@/lib/queries/site";

export const runtime = "nodejs";

export async function GET() {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const setting = await prisma.siteSetting.findUnique({
      where: { key: "homepage_featured_media_id" },
    });
    return NextResponse.json({
      ok: true,
      mediaId: setting?.value?.trim() ?? null,
    });
  } catch (err: unknown) {
    console.error("HOMEPAGE_FEATURED_GET_ERROR", err);
    return NextResponse.json({ ok: false, error: "Failed to load." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const body = (await req.json()) as { mediaId?: string };
    const mediaId = typeof body.mediaId === "string" ? body.mediaId.trim() : "";
    if (!mediaId) {
      return NextResponse.json({ ok: false, error: "mediaId required." }, { status: 400 });
    }
    const media = await prisma.mediaAsset.findUnique({
      where: { id: mediaId, kind: "IMAGE" },
    });
    if (!media?.keyFull) {
      return NextResponse.json(
        { ok: false, error: "Media not found or not an image." },
        { status: 404 }
      );
    }
    await setHomepageFeaturedMedia(mediaId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("HOMEPAGE_FEATURED_POST_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to save.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
