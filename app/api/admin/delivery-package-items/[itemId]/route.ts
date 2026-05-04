import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { cleanText, normalizeDeliveryGroup } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LICENSED_USAGE_TYPES = new Set(["web", "print", "campaign", "exclusive", "marketing", "social"]);

function normalizeLicensedUsageTypes(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (cleanText(item) ?? "").toLowerCase())
    .filter((item) => LICENSED_USAGE_TYPES.has(item));
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { itemId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const item = await prisma.deliveryPackageItem.update({
    where: { id: itemId },
    data: {
      deliveryGroup: body.deliveryGroup !== undefined ? normalizeDeliveryGroup(body.deliveryGroup) ?? undefined : undefined,
      usageSuggestion: body.usageSuggestion !== undefined ? cleanText(body.usageSuggestion) : undefined,
      clientFacingCaption: body.clientFacingCaption !== undefined ? cleanText(body.clientFacingCaption) : undefined,
      aiDescription: body.aiDescription !== undefined ? cleanText(body.aiDescription) : undefined,
      altText: body.altText !== undefined ? cleanText(body.altText) : undefined,
      imagePurpose: body.imagePurpose !== undefined ? cleanText(body.imagePurpose) : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      selectedForDelivery: typeof body.selectedForDelivery === "boolean" ? body.selectedForDelivery : undefined,
      downloadUrl: body.downloadUrl !== undefined ? cleanText(body.downloadUrl) : undefined,
      storageKey: body.storageKey !== undefined ? cleanText(body.storageKey) : undefined,
      licensedUsageTypes: body.licensedUsageTypes !== undefined ? normalizeLicensedUsageTypes(body.licensedUsageTypes) : undefined,
      licensingNotes: body.licensingNotes !== undefined ? cleanText(body.licensingNotes) : undefined,
      licenseExpiresAt: body.licenseExpiresAt !== undefined ? normalizeDate(body.licenseExpiresAt) : undefined,
    },
    include: { mediaAsset: true },
  });
  if (body.altText !== undefined) {
    await prisma.mediaAsset.update({ where: { id: item.mediaAssetId }, data: { alt: cleanText(body.altText) } });
  }
  return NextResponse.json({ ok: true, item });
}

