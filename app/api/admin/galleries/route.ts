import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  const galleries = await prisma.gallery.findMany({
    include: {
      client: true,
      project: true,
      images: { orderBy: { sortOrder: "asc" } },
      accessTokens: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, galleries });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    description?: string;
    coverUrl?: string;
    published?: boolean;
    clientId?: string | null;
    projectId?: string | null;
  };

  if (!body.title) {
    return NextResponse.json(
      { ok: false, error: "Title is required." },
      { status: 400 }
    );
  }

  const slug = body.slug?.trim() || slugify(body.title);

  const gallery = await prisma.gallery.create({
    data: {
      title: body.title,
      slug,
      description: body.description || null,
      coverUrl: body.coverUrl || null,
      published: Boolean(body.published),
      clientId: body.clientId || null,
      projectId: body.projectId || null,
    },
    include: { client: true, project: true },
  });

  return NextResponse.json({ ok: true, gallery });
}
