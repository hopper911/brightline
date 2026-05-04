import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signGet } from "@/lib/storage-r2";
import { recomputeDeliveryItemPerformance } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ accessToken: string; itemId: string }> }
) {
  const { accessToken, itemId } = await context.params;
  const pkg = await prisma.deliveryPackage.findUnique({ where: { accessToken } });
  if (!pkg || (pkg.expiresAt && pkg.expiresAt.getTime() < Date.now())) {
    return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  }
  const item = await prisma.deliveryPackageItem.findFirst({
    where: { id: itemId, deliveryPackageId: pkg.id, selectedForDelivery: true },
    include: { mediaAsset: true },
  });
  const key = item?.storageKey ?? item?.mediaAsset.keyFull;
  if (!item || !key) return NextResponse.json({ ok: false, error: "File not found." }, { status: 404 });
  const variant = new URL(req.url).searchParams.get("variant");
  const eventType = variant === "web" || variant === "print" ? `image_downloaded_${variant}` : "image_downloaded";
  const h = await headers();
  await prisma.packageAccessLog.create({
    data: {
      deliveryPackageId: pkg.id,
      deliveryPackageItemId: item.id,
      eventType,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  }).catch(() => null);
  await prisma.deliveryPackageItem.update({
    where: { id: item.id },
    data: { downloadCount: { increment: 1 } },
  });
  await recomputeDeliveryItemPerformance(item.id);
  const signed = await signGet({ key, expiresIn: 300 });
  return NextResponse.redirect(signed.url);
}

