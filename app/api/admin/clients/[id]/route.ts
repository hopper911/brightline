import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { prisma } from "@/lib/prisma";
import { rejectUnlessPlatformPermission } from "@/lib/platform/authorization/require-route-permission";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;
  const rbacDenied = await rejectUnlessPlatformPermission("brightline.gallery.write");
  if (rbacDenied) return rbacDenied;

  const { id } = await context.params;
  await prisma.galleryAccessToken.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
