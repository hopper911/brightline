import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recomputeDeliveryItemPerformance } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function boundedInt(value: unknown, max: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(max, Math.round(numeric)));
}

export async function POST(
  req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  const { accessToken } = await context.params;
  const pkg = await prisma.deliveryPackage.findFirst({
    where: { accessToken, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
  if (!pkg) return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  const eventType =
    body.eventType === "image_viewed" || body.eventType === "image_clicked"
      ? body.eventType
      : null;
  if (!itemId || !eventType) {
    return NextResponse.json({ ok: false, error: "itemId and valid eventType are required." }, { status: 400 });
  }

  const item = await prisma.deliveryPackageItem.findFirst({
    where: { id: itemId, deliveryPackageId: pkg.id },
  });
  if (!item) return NextResponse.json({ ok: false, error: "Package item not found." }, { status: 404 });

  const durationMs = boundedInt(body.durationMs, 60 * 60 * 1000);
  const clickOrder = boundedInt(body.clickOrder, 10000);
  const h = await headers();
  await prisma.packageAccessLog.create({
    data: {
      deliveryPackageId: pkg.id,
      deliveryPackageItemId: item.id,
      eventType,
      durationMs,
      clickOrder,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  });

  await prisma.deliveryPackageItem.update({
    where: { id: item.id },
    data:
      eventType === "image_viewed"
        ? {
            viewCount: { increment: 1 },
            totalViewDurationMs: { increment: durationMs ?? 0 },
          }
        : {
            firstClickOrder: item.firstClickOrder ?? clickOrder ?? undefined,
            lastClickOrder: clickOrder ?? undefined,
          },
  });
  await recomputeDeliveryItemPerformance(item.id);
  return NextResponse.json({ ok: true });
}

