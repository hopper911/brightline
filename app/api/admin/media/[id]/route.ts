import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await hasAdminAccess();
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
