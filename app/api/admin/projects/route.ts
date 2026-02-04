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
  const projects = await prisma.project.findMany({
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      tags: { include: { tag: true } },
      client: true,
      galleries: true,
      testimonials: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    description?: string;
    category?: string;
    location?: string;
    year?: string;
    coverUrl?: string;
    featured?: boolean;
    published?: boolean;
    clientId?: string | null;
    tagIds?: string[];
  };

  if (!body.title) {
    return NextResponse.json(
      { ok: false, error: "Title is required." },
      { status: 400 }
    );
  }

  const slug = body.slug?.trim() || slugify(body.title);

  const project = await prisma.project.create({
    data: {
      title: body.title,
      slug,
      description: body.description || null,
      category: body.category || null,
      location: body.location || null,
      year: body.year || null,
      coverUrl: body.coverUrl || null,
      featured: Boolean(body.featured),
      published: Boolean(body.published),
      clientId: body.clientId || null,
      tags: body.tagIds?.length
        ? {
            create: body.tagIds.map((tagId) => ({ tagId })),
          }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      client: true,
    },
  });

  return NextResponse.json({ ok: true, project });
}
