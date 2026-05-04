import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { cleanText, normalizeDeliveryGroup } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Recommendation = {
  id?: unknown;
  recommendedDeliveryGroup?: unknown;
  usageSuggestion?: unknown;
  clientFacingCaption?: unknown;
  aiDescription?: unknown;
  imagePurpose?: unknown;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { packageId } = await context.params;
  let body: { recommendations?: Recommendation[]; overwriteExisting?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const recommendations = Array.isArray(body.recommendations) ? body.recommendations : [];
  const overwriteExisting = Boolean(body.overwriteExisting);
  const updated = [];
  for (const recommendation of recommendations) {
    const itemId = cleanText(recommendation.id);
    if (!itemId) continue;
    const current = await prisma.deliveryPackageItem.findFirst({ where: { id: itemId, deliveryPackageId: packageId } });
    if (!current) continue;
    updated.push(
      await prisma.deliveryPackageItem.update({
        where: { id: itemId },
        data: {
          deliveryGroup:
            overwriteExisting || !current.deliveryGroup
              ? normalizeDeliveryGroup(recommendation.recommendedDeliveryGroup) ?? current.deliveryGroup
              : undefined,
          usageSuggestion:
            overwriteExisting || !current.usageSuggestion ? cleanText(recommendation.usageSuggestion) : undefined,
          clientFacingCaption:
            overwriteExisting || !current.clientFacingCaption ? cleanText(recommendation.clientFacingCaption) : undefined,
          aiDescription: overwriteExisting || !current.aiDescription ? cleanText(recommendation.aiDescription) : undefined,
          imagePurpose: overwriteExisting || !current.imagePurpose ? cleanText(recommendation.imagePurpose) : undefined,
          selectedForDelivery: true,
        },
      })
    );
  }
  return NextResponse.json({ ok: true, updated });
}

