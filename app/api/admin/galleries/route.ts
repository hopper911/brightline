import { NextResponse } from "next/server";
import type { GalleryStatus, GalleryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

const GALLERY_STATUSES: readonly GalleryStatus[] = [
  "DRAFT",
  "READY_TO_SEND",
  "SENT",
  "CLIENT_REVIEWING",
  "SELECTIONS_RECEIVED",
  "FINALIZED",
  "DELIVERED",
  "EXPIRED",
  "ARCHIVED",
];

const GALLERY_TYPES: readonly GalleryType[] = [
  "PROOF",
  "SELECTION",
  "FINAL_DELIVERY",
  "INTERNAL_REVIEW",
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const galleries = await prisma.gallery.findMany({
    include: {
      client: true,
      project: true,
      studioProject: { select: { id: true, title: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      accessTokens: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, galleries });
}

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    description?: string;
    coverUrl?: string;
    published?: boolean;
    clientId?: string | null;
    projectId?: string | null;
    studioProjectId?: string | null;
    status?: GalleryStatus;
    galleryType?: GalleryType;
  };

  if (!body.title) {
    return NextResponse.json(
      { ok: false, error: "Title is required." },
      { status: 400 }
    );
  }

  const slug = body.slug?.trim() || slugify(body.title);

  const status =
    body.status && GALLERY_STATUSES.includes(body.status) ? body.status : undefined;
  const galleryType =
    body.galleryType && GALLERY_TYPES.includes(body.galleryType)
      ? body.galleryType
      : undefined;

  const gallery = await prisma.gallery.create({
    data: {
      title: body.title,
      slug,
      description: body.description || null,
      coverUrl: body.coverUrl || null,
      published: Boolean(body.published),
      clientId: body.clientId || null,
      projectId: body.projectId || null,
      studioProjectId: body.studioProjectId ?? undefined,
      ...(status ? { status } : {}),
      ...(galleryType ? { galleryType } : {}),
    },
    include: {
      client: true,
      project: true,
      studioProject: { select: { id: true, title: true, slug: true } },
    },
  });

  return NextResponse.json({ ok: true, gallery });
}
