import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as { name?: string; slug?: string };

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      slug: body.slug ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, tag });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.tag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
