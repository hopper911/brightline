import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await prisma.galleryAccessToken.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
