import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as {
    title?: string;
    slug?: string;
    description?: string | null;
    category?: string | null;
    location?: string | null;
    year?: string | null;
    coverUrl?: string | null;
    featured?: boolean;
    published?: boolean;
    clientId?: string | null;
    tagIds?: string[];
  };

  const project = await prisma.project.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      slug: body.slug ?? undefined,
      description: body.description ?? undefined,
      category: body.category ?? undefined,
      location: body.location ?? undefined,
      year: body.year ?? undefined,
      coverUrl: body.coverUrl ?? undefined,
      featured:
        typeof body.featured === "boolean" ? body.featured : undefined,
      published:
        typeof body.published === "boolean" ? body.published : undefined,
      clientId: body.clientId ?? undefined,
    },
    include: { tags: { include: { tag: true } }, client: true },
  });

  if (body.tagIds) {
    await prisma.projectTag.deleteMany({ where: { projectId: id } });
    if (body.tagIds.length) {
      await prisma.projectTag.createMany({
        data: body.tagIds.map((tagId) => ({ projectId: id, tagId })),
      });
    }
  }

  const refreshed = await prisma.project.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } }, client: true },
  });

  return NextResponse.json({ ok: true, project: refreshed ?? project });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
