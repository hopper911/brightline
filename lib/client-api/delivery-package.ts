import { prisma } from "@/lib/prisma";

/**
 * Load a delivery package item that is allowed for client download under the given opaque token.
 * Centralizes the `deliveryPackageId` + `selectedForDelivery` guard for IDOR safety.
 */
export async function resolveDeliverablePackageItem(accessToken: string, itemId: string) {
  const pkg = await prisma.deliveryPackage.findUnique({ where: { accessToken } });
  if (!pkg || (pkg.expiresAt && pkg.expiresAt.getTime() < Date.now())) {
    return { ok: false as const, status: 404 as const };
  }

  const item = await prisma.deliveryPackageItem.findFirst({
    where: { id: itemId, deliveryPackageId: pkg.id, selectedForDelivery: true },
    include: { mediaAsset: true },
  });

  const key = item?.storageKey ?? item?.mediaAsset?.keyFull ?? null;
  if (!item || !key) {
    return { ok: false as const, status: 404 as const };
  }

  return { ok: true as const, pkg, item, key };
}
