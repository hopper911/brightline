import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { normalizeUploadContentType } from "@/lib/upload-mime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
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

    const contentType = normalizeUploadContentType(body.contentType || "image/jpeg");
    if (!contentType) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unsupported content type. Upload images, video, audio, PDF, or fonts only (not HTML/SVG).",
        },
        { status: 400 }
      );
    }

    const safeName = body.filename.replace(/[^\w.-]/g, "-");
    const key = `client-galleries/${id}/${Date.now()}-${safeName}`;

    const { getClientUploadUrl } = await import("@/lib/image-strategy");
    const signed = await getClientUploadUrl({
      key,
      contentType,
    });

    const image = await prisma.galleryImage.create({
      data: {
        galleryId: id,
        url: "",
        alt: body.alt || null,
        filename: safeName,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        storageKey: key,
      },
    });

    return NextResponse.json({ ok: true, image, upload: signed });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create upload URL." },
      { status: 500 }
    );
  }
}
