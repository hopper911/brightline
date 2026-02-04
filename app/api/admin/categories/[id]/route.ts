import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = (await req.json()) as { name?: string; slug?: string };

  if (!body.name && !body.slug) {
    return NextResponse.json(
      { ok: false, error: "Nothing to update." },
      { status: 400 }
    );
  }

  const category = await prisma.portfolioCategory.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      slug: body.slug ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, category });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.portfolioCategory.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
