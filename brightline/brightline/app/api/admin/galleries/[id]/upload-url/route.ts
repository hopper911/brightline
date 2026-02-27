import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { getClientUploadUrl } from "@/lib/image-strategy";
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

    const { id } = await context.params;
    const body = (await req.json()) as {
      filename?: string;
      contentType?: string;
      alt?: string;
      sortOrder?: number;
    };

    if (!body.filename) {
      return NextResponse.json(
        { ok: false, error: "Filename required." },
        { status: 400 }
      );
    }

    const ext = body.filename.split(".").pop() || "jpg";
    const safeName = body.filename.replace(/[^\w.-]/g, "-");
    const key = `client-galleries/${id}/${Date.now()}-${safeName}`;

    const signed = await getClientUploadUrl({
      key,
      contentType: body.contentType || "image/jpeg",
    });

    const image = await prisma.galleryImage.create({
      data: {
        galleryId: id,
        url: "",
        alt: body.alt || null,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        storageKey: key,
      },
    });

    return NextResponse.json({ ok: true, image, upload: signed });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Unable to create upload URL." },
      { status: 500 }
    );
  }
}
