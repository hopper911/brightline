import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

const PILLARS = ["arc", "cam", "cor"] as const;

async function authorize(req: Request): Promise<boolean> {
  const session = await hasAdminAccess();
  if (session) return true;

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.UPLOAD_TOKEN;
  return Boolean(expected && token && token === expected);
}

export async function POST(req: Request) {
  try {
    if (!(await authorize(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: {
      section?: string;
      capturedDate?: string;
      sequence?: string;
      filename?: string;
      fullUrl?: string;
      thumbUrl?: string;
      r2KeyFull?: string;
      r2KeyThumb?: string;
      sheetRowId?: string;
      projectId?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const section = (body.section ?? "").trim().toLowerCase();
    if (!PILLARS.includes(section as (typeof PILLARS)[number])) {
      return NextResponse.json(
        { ok: false, error: "section must be arc, cam, or cor." },
        { status: 400 }
      );
    }

    const capturedDate = (body.capturedDate ?? "").trim().replace(/-/g, "");
    const sequence = (body.sequence ?? "001").trim().padStart(3, "0");
    const filename = (body.filename ?? "").trim() || `${section}-${capturedDate}-${sequence}.webp`;
    const fullUrl = (body.fullUrl ?? "").trim();
    const thumbUrl = (body.thumbUrl ?? "").trim();
    const r2KeyFull = (body.r2KeyFull ?? "").trim();
    const r2KeyThumb = (body.r2KeyThumb ?? "").trim();

    if (!fullUrl && !r2KeyFull) {
      return NextResponse.json(
        { ok: false, error: "fullUrl or r2KeyFull is required." },
        { status: 400 }
      );
    }

    const r2Base =
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
      process.env.R2_PUBLIC_URL ||
      "";
    const resolvedFullUrl = fullUrl || (r2Base && r2KeyFull ? `${r2Base.replace(/\/+$/, "")}/${r2KeyFull}` : "");
    const resolvedThumbUrl =
      thumbUrl || (r2Base && r2KeyThumb ? `${r2Base.replace(/\/+$/, "")}/${r2KeyThumb}` : resolvedFullUrl);
    const storageKey = r2KeyFull || undefined;

    const yyyymmdd = capturedDate || new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const gallerySlug = `${section}-import-${yyyymmdd}`;

    const gallery = await prisma.gallery.upsert({
      where: { slug: gallerySlug },
      update: {},
      create: {
        slug: gallerySlug,
        title: `${section} import ${yyyymmdd}`,
        section,
        published: false,
      },
    });

    const existingCount = await prisma.galleryImage.count({
      where: { galleryId: gallery.id },
    });
    const sortOrder = existingCount;
    const isHero = existingCount === 0;

    const image = await prisma.galleryImage.create({
      data: {
        galleryId: gallery.id,
        url: resolvedFullUrl,
        fullUrl: resolvedFullUrl,
        thumbUrl: resolvedThumbUrl,
        alt: filename.replace(/\.[^.]+$/, ""),
        filename,
        sortOrder,
        isHero,
        storageKey,
      },
    });

    const projectId = body.projectId?.trim();
    if (projectId) {
      const project = await prisma.workProject.findUnique({
        where: { id: projectId },
      });
      if (project) {
        const mediaAsset = await prisma.mediaAsset.create({
          data: {
            kind: "IMAGE",
            keyFull: r2KeyFull || null,
            keyThumb: r2KeyThumb || null,
            alt: filename.replace(/\.[^.]+$/, ""),
          },
        });
        const maxOrder = await prisma.projectMedia
          .aggregate({
            where: { projectId },
            _max: { sortOrder: true },
          })
          .then((r) => (r._max.sortOrder ?? -1) + 1);
        await prisma.projectMedia.create({
          data: {
            projectId,
            mediaId: mediaAsset.id,
            sortOrder: maxOrder,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      galleryId: gallery.id,
      imageId: image.id,
    });
  } catch (err: unknown) {
    console.error("MEDIA_UPSERT_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to upsert media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
