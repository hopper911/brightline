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
    coverUrl?: string | null;
    published?: boolean;
    clientId?: string | null;
    projectId?: string | null;
  };

  const gallery = await prisma.gallery.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      slug: body.slug ?? undefined,
      description: body.description ?? undefined,
      coverUrl: body.coverUrl ?? undefined,
      published:
        typeof body.published === "boolean" ? body.published : undefined,
      clientId: body.clientId ?? undefined,
      projectId: body.projectId ?? undefined,
    },
    include: { client: true, project: true },
  });

  return NextResponse.json({ ok: true, gallery });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.gallery.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
