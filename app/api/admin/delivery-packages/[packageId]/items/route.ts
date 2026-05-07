import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { cleanText, normalizeDeliveryGroup } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { packageId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const mediaAssetId = cleanText(body.mediaAssetId);
  if (!mediaAssetId) return NextResponse.json({ ok: false, error: "mediaAssetId is required." }, { status: 400 });
  const media = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
  if (!media) return NextResponse.json({ ok: false, error: "Media asset not found." }, { status: 404 });
  const last = await prisma.deliveryPackageItem.findFirst({
    where: { deliveryPackageId: packageId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const variantKey = cleanText(body.variantKey) ?? "";

  const item = await prisma.deliveryPackageItem.upsert({
    where: {
      deliveryPackageId_mediaAssetId_variantKey: {
        deliveryPackageId: packageId,
        mediaAssetId,
        variantKey,
      },
    },
    update: { selectedForDelivery: true },
    create: {
      deliveryPackageId: packageId,
      mediaAssetId,
      variantKey,
      deliveryGroup: normalizeDeliveryGroup(body.deliveryGroup) ?? "archive",
      altText: media.alt,
      storageKey: media.keyFull,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
    include: { mediaAsset: true },
  });
  return NextResponse.json({ ok: true, item });
}

