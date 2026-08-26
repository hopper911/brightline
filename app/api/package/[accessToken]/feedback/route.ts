import { packageFeedbackBodySchema } from "@/lib/api/client-package-schemas";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { parseJsonWithSchema } from "@/lib/api/parse";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip)) {
    return jsonErr("Too many requests.", 429);
  }

  const { accessToken } = await context.params;
  const parsed = await parseJsonWithSchema(req, packageFeedbackBodySchema);
  if (!parsed.ok) return parsed.response;

  const { itemId, eventType } = parsed.data;
  const comment = parsed.data.comment?.trim() || "";

  const pkg = await prisma.deliveryPackage.findFirst({
    where: { accessToken, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true },
  });
  if (!pkg) return jsonErr("Package not found.", 404);

  const item = await prisma.deliveryPackageItem.findFirst({
    where: { id: itemId, deliveryPackageId: pkg.id, selectedForDelivery: true },
    select: { id: true },
  });
  if (!item) return jsonErr("Image not found.", 404);

  await prisma.deliveryPackageItemFeedback.create({
    data: {
      deliveryPackageId: pkg.id,
      deliveryPackageItemId: item.id,
      eventType,
      comment: comment || null,
    },
  });

  await prisma.packageAccessLog
    .create({
      data: {
        deliveryPackageId: pkg.id,
        deliveryPackageItemId: item.id,
        eventType: `feedback_${eventType}`,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent"),
      },
    })
    .catch(() => null);

  return jsonOk({});
}
