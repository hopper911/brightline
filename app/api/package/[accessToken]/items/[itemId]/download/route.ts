import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { jsonErr } from "@/lib/api/http";
import { resolveDeliverablePackageItem } from "@/lib/client-api/delivery-package";
import { rejectIfTokenDownloadLimited } from "@/lib/client-token-rate-limit";
import { recomputeDeliveryItemPerformance } from "@/lib/delivery/db";
import { prisma } from "@/lib/prisma";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ accessToken: string; itemId: string }> }
) {
  const { accessToken, itemId } = await context.params;
  const limited = await rejectIfTokenDownloadLimited(req, accessToken, "package-item-dl", {
    max: 120,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const resolved = await resolveDeliverablePackageItem(accessToken, itemId);
  if (!resolved.ok) {
    return jsonErr("File not found.", 404);
  }

  const { pkg, item, key } = resolved;
  const variant = new URL(req.url).searchParams.get("variant");
  const eventType =
    variant === "web" || variant === "print" ? `image_downloaded_${variant}` : "image_downloaded";
  const h = await headers();
  await prisma.packageAccessLog
    .create({
      data: {
        deliveryPackageId: pkg.id,
        deliveryPackageItemId: item.id,
        eventType,
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent"),
      },
    })
    .catch(() => null);
  await prisma.deliveryPackageItem.update({
    where: { id: item.id },
    data: { downloadCount: { increment: 1 } },
  });
  await recomputeDeliveryItemPerformance(item.id);
  const signed = await signGet({ key, expiresIn: 300 });
  return NextResponse.redirect(signed.url);
}
