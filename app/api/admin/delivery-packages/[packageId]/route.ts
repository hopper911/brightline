import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { buildExtendedDeliveryManifest } from "@/lib/delivery/manifest-docs";
import {
  normalizePackageStatus,
  packageInclude,
} from "@/lib/delivery/db";
import { cleanText } from "@/lib/delivery/package";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  const denied = await guardAdminJson(_req);
  if (denied) return denied;
  const { packageId } = await context.params;
  const pkg = await prisma.deliveryPackage.findUnique({
    where: { id: packageId },
    include: packageInclude(),
  });
  if (!pkg) return jsonErr("Delivery package not found.", 404);
  return jsonOk({ package: pkg });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const { packageId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("Invalid JSON body.", 400);
  }

  const existing = await prisma.deliveryPackage.findUnique({
    where: { id: packageId },
    include: packageInclude(),
  });
  if (!existing) return jsonErr("Delivery package not found.", 404);

  let statusNorm: string | undefined;
  if (body.status !== undefined) {
    statusNorm = normalizePackageStatus(body.status);
    if (!statusNorm) return jsonErr("Invalid status.", 400);
  }

  let nextPublicSlug: string | null | undefined;
  if (body.generatePublicSlug === true) {
    nextPublicSlug = randomBytes(9).toString("base64url");
  } else if (body.publicSlug === null) {
    nextPublicSlug = null;
  } else if (body.publicSlug !== undefined) {
    const raw = cleanText(body.publicSlug);
    nextPublicSlug = raw === "" || raw === undefined ? null : raw;
  }

  if (nextPublicSlug !== undefined && nextPublicSlug !== null) {
    const clash = await prisma.deliveryPackage.findFirst({
      where: { publicSlug: nextPublicSlug, NOT: { id: packageId } },
      select: { id: true },
    });
    if (clash) return jsonErr("publicSlug already in use.", 409);
  }

  const title =
    body.title !== undefined ? cleanText(body.title) ?? existing.title : existing.title;
  const notes =
    body.notes !== undefined ? cleanText(body.notes) : existing.notes;
  const usageRights =
    body.usageRights !== undefined
      ? cleanText(body.usageRights)
      : existing.usageRights;
  const deliveryMessage =
    body.deliveryMessage !== undefined
      ? cleanText(body.deliveryMessage)
      : existing.deliveryMessage;
  const status =
    statusNorm !== undefined ? statusNorm : existing.status;

  const mergedForManifest = {
    ...existing,
    title,
    notes,
    usageRights,
    deliveryMessage,
    status,
    ...(nextPublicSlug !== undefined ? { publicSlug: nextPublicSlug } : {}),
    expiresAt:
      body.expiresAt !== undefined
        ? body.expiresAt
          ? new Date(String(body.expiresAt))
          : null
        : existing.expiresAt,
    deliveryDate:
      body.deliveryDate !== undefined
        ? body.deliveryDate
          ? new Date(String(body.deliveryDate))
          : null
        : existing.deliveryDate,
  };

  const updateData: Prisma.DeliveryPackageUpdateInput = {
    title: body.title !== undefined ? title : undefined,
    status: statusNorm,
    notes: body.notes !== undefined ? (notes ?? null) : undefined,
    usageRights:
      body.usageRights !== undefined ? (usageRights ?? null) : undefined,
    deliveryMessage:
      body.deliveryMessage !== undefined
        ? (deliveryMessage ?? null)
        : undefined,
    publicSlug:
      nextPublicSlug !== undefined ? nextPublicSlug : undefined,
    expiresAt:
      body.expiresAt !== undefined
        ? body.expiresAt
          ? new Date(String(body.expiresAt))
          : null
        : undefined,
    deliveryDate:
      body.deliveryDate !== undefined
        ? body.deliveryDate
          ? new Date(String(body.deliveryDate))
          : null
        : undefined,
  };

  if (body.rebuildManifest === true) {
    updateData.manifestJSON = buildExtendedDeliveryManifest(
      mergedForManifest
    ) as Prisma.InputJsonValue;
  } else if (body.manifestJSON !== undefined) {
    updateData.manifestJSON = body.manifestJSON as Prisma.InputJsonValue;
  }

  const updated = await prisma.deliveryPackage.update({
    where: { id: packageId },
    data: updateData,
    include: packageInclude(),
  });

  return jsonOk({ package: updated });
}
