import { randomBytes } from "crypto";
import { Prisma, type StudioInvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DELIVERY_GROUPS, cleanText, normalizeDeliveryGroup } from "@/lib/delivery/package";

export function createPackageAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function normalizePackageStatus(value: unknown) {
  const status = cleanText(value)?.toLowerCase();
  return ["draft", "prepared", "sent", "viewed", "approved", "archived"].includes(status ?? "")
    ? status
    : undefined;
}

export function normalizeInvoiceStatus(value: unknown) {
  const status = cleanText(value)?.toUpperCase();
  return ["DRAFT", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "FAILED", "OVERDUE", "CANCELED", "VOID"].includes(status ?? "")
    ? (status as StudioInvoiceStatus)
    : undefined;
}

export function defaultLicensedUsageTypes(deliveryGroup: string | null | undefined) {
  switch (normalizeDeliveryGroup(deliveryGroup)) {
    case "web":
    case "hero":
    case "details":
    case "interior":
      return ["web", "marketing"];
    case "print":
      return ["print"];
    case "social":
      return ["social", "marketing"];
    default:
      return ["web"];
  }
}

export function parseDecimal(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return new Prisma.Decimal(fallback);
  const decimal = new Prisma.Decimal(String(value));
  return decimal.isFinite() ? decimal : new Prisma.Decimal(fallback);
}

export function lineAmount(quantity: Prisma.Decimal, rate: Prisma.Decimal) {
  return quantity.mul(rate).toDecimalPlaces(2);
}

export function scoreDeliveryPerformance(input: {
  downloadCount: number;
  viewCount: number;
  totalViewDurationMs: number;
  firstClickOrder: number | null;
}) {
  const averageSeconds = input.viewCount > 0 ? input.totalViewDurationMs / input.viewCount / 1000 : 0;
  const clickBonus = input.firstClickOrder ? Math.max(0, 20 - input.firstClickOrder * 2) : 0;
  const score = Math.min(
    100,
    Math.round(input.downloadCount * 22 + input.viewCount * 4 + averageSeconds * 1.5 + clickBonus)
  );
  const usageLikelihood = score >= 75 ? "high" : score >= 40 ? "medium" : "low";
  const recommendedPlacement =
    score >= 85 ? "hero" : score >= 65 ? "supporting" : score >= 35 ? "social" : "archive";
  return { score, usageLikelihood, recommendedPlacement };
}

export async function recomputeDeliveryItemPerformance(itemId: string) {
  const item = await prisma.deliveryPackageItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      downloadCount: true,
      viewCount: true,
      totalViewDurationMs: true,
      firstClickOrder: true,
    },
  });
  if (!item) return null;
  const performance = scoreDeliveryPerformance(item);
  return prisma.deliveryPackageItem.update({
    where: { id: item.id },
    data: {
      performanceScore: performance.score,
      usageLikelihood: performance.usageLikelihood,
      performanceRecommendedPlacement: performance.recommendedPlacement,
    },
  });
}

export async function resolveStudioClientIdForWorkProject(projectId: string) {
  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    select: { studioProjectId: true },
  });
  if (!project?.studioProjectId) return null;
  const studioProject = await prisma.studioProject.findUnique({
    where: { id: project.studioProjectId },
    select: { clientId: true },
  });
  return studioProject?.clientId ?? null;
}

export function packageInclude() {
  return {
    project: true,
    client: true,
    items: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" as const } },
    invoices: { include: { client: true, lineItems: { orderBy: { sortOrder: "asc" as const } } } },
  };
}

export async function createDefaultPackageItems(deliveryPackageId: string, projectId: string) {
  const media = await prisma.projectMedia.findMany({
    where: { projectId, media: { kind: "IMAGE" } },
    include: { media: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const item of media) {
    await prisma.deliveryPackageItem.upsert({
      where: { deliveryPackageId_mediaAssetId: { deliveryPackageId, mediaAssetId: item.mediaId } },
      update: {},
      create: {
        deliveryPackageId,
        mediaAssetId: item.mediaId,
        deliveryGroup: normalizeDeliveryGroup(item.deliveryGroup) ?? "archive",
        usageSuggestion: item.usageSuggestion,
        clientFacingCaption: item.clientFacingCaption,
        aiDescription: item.aiDescription,
        altText: item.media.alt,
        imagePurpose: item.imagePurpose,
        sortOrder: item.sortOrder,
        selectedForDelivery: item.selectedForDelivery,
        storageKey: item.media.keyFull,
        licensedUsageTypes: defaultLicensedUsageTypes(item.deliveryGroup),
        licensingNotes: "Licensed for approved Bright Line client marketing use.",
      },
    });
  }
}

export function serializePackageManifest(pkg: Awaited<ReturnType<typeof prisma.deliveryPackage.findUnique>>) {
  if (!pkg || !("items" in pkg)) return null;
  const withItems = pkg as NonNullable<typeof pkg> & {
    project?: { title?: string | null; seoTitle?: string | null; metaDescription?: string | null; tags?: string[] };
    client?: { companyName?: string | null } | null;
    items: Array<{
      id: string;
      deliveryGroup: string;
      usageSuggestion: string | null;
      clientFacingCaption: string | null;
      aiDescription: string | null;
      altText: string | null;
      imagePurpose: string | null;
      sortOrder: number;
      selectedForDelivery: boolean;
      storageKey: string | null;
      mediaAsset: { id: string; keyFull: string | null; keyThumb: string | null; alt: string | null };
    }>;
  };
  return {
    package: {
      id: withItems.id,
      title: withItems.title,
      status: withItems.status,
      deliveryDate: withItems.deliveryDate,
      notes: withItems.notes,
    },
    project: {
      title: withItems.project?.title,
      seoTitle: withItems.project?.seoTitle,
      metaDescription: withItems.project?.metaDescription,
      tags: withItems.project?.tags ?? [],
    },
    client: { name: withItems.client?.companyName },
    groups: DELIVERY_GROUPS.map((group) => ({
      group,
      images: withItems.items
        .filter((item) => item.selectedForDelivery && item.deliveryGroup === group)
        .map((item) => ({
          id: item.id,
          mediaAssetId: item.mediaAsset.id,
          storageKey: item.storageKey ?? item.mediaAsset.keyFull,
          thumbKey: item.mediaAsset.keyThumb,
          altText: item.altText ?? item.mediaAsset.alt,
          usageSuggestion: item.usageSuggestion,
          clientFacingCaption: item.clientFacingCaption,
          aiDescription: item.aiDescription,
          imagePurpose: item.imagePurpose,
          sortOrder: item.sortOrder,
        })),
    })),
    positioning: "Bright Line delivers a ready-to-use visual system, not just a folder of images.",
  };
}

