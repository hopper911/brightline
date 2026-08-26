import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const { id } = await context.params;
  await prisma.galleryAccessToken.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
