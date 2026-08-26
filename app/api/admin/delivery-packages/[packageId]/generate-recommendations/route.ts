import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getPublicR2Url } from "@/lib/r2";
import { generateDeliveryRecommendations } from "@/lib/ai/generateDeliveryRecommendations";

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
  const pkg = await prisma.deliveryPackage.findUnique({
    where: { id: packageId },
    include: {
      project: true,
      client: true,
      items: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!pkg) return NextResponse.json({ ok: false, error: "Delivery package not found." }, { status: 404 });

  const origin = new URL(req.url).origin;
  const images = pkg.items
    .map((item) => {
      const key = item.storageKey ?? item.mediaAsset.keyFull ?? item.mediaAsset.keyThumb;
      return key
        ? {
            id: item.id,
            url: new URL(getPublicR2Url(key), origin).toString(),
            filename: key.split("/").pop(),
            existingAltText: item.altText ?? item.mediaAsset.alt ?? undefined,
            existingCaption: item.clientFacingCaption ?? undefined,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const result = await generateDeliveryRecommendations({
    projectId: pkg.projectId,
    origin,
    projectContext: {
      packageId: pkg.id,
      clientName: pkg.client?.companyName ?? pkg.project.client,
      projectTitle: pkg.project.title,
      pillar: pkg.project.section,
      location: pkg.project.location,
      seoTitle: pkg.project.seoTitle,
      metaDescription: pkg.project.metaDescription,
    },
    images,
  });

  await prisma.aiGeneration.create({
    data: {
      projectId: pkg.projectId,
      generationType: "delivery_recommendation",
      promptMode: "delivery_package",
      fieldKey: "deliveryPackage",
      inputBrief: { packageId: pkg.id, imageCount: images.length },
      outputJSON: result,
      modelUsed: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      createdBy: "admin",
    },
  });

  return NextResponse.json({ ok: true, ...result });
}

