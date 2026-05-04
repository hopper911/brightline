import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEEDBACK_EVENTS = new Set(["approved", "flagged", "commented", "revision_requested"]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });

  const { accessToken } = await context.params;
  const body = await req.json().catch(() => null) as { itemId?: unknown; eventType?: unknown; comment?: unknown } | null;
  const itemId = cleanText(body?.itemId);
  const eventType = cleanText(body?.eventType);
  const comment = cleanText(body?.comment);

  if (!itemId || !FEEDBACK_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: false, error: "Invalid feedback." }, { status: 400 });
  }

  const pkg = await prisma.deliveryPackage.findFirst({
    where: { accessToken, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true },
  });
  if (!pkg) return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });

  const item = await prisma.deliveryPackageItem.findFirst({
    where: { id: itemId, deliveryPackageId: pkg.id, selectedForDelivery: true },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ ok: false, error: "Image not found." }, { status: 404 });

  await prisma.deliveryPackageItemFeedback.create({
    data: {
      deliveryPackageId: pkg.id,
      deliveryPackageItemId: item.id,
      eventType,
      comment: comment || null,
    },
  });

  await prisma.packageAccessLog.create({
    data: {
      deliveryPackageId: pkg.id,
      deliveryPackageItemId: item.id,
      eventType: `feedback_${eventType}`,
      ipAddress: ip,
      userAgent: req.headers.get("user-agent"),
    },
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}

