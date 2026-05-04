import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { generateVisualStrategyReport } from "@/lib/ai/clientPackageContent";
import { prisma } from "@/lib/prisma";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ accessToken: string }> }) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });

  const { accessToken } = await context.params;
  const pkg = await prisma.deliveryPackage.findFirst({
    where: { accessToken, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    include: {
      project: true,
      client: true,
      items: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!pkg) return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  if (pkg.visualStrategyReportJSON) {
    return NextResponse.json({ ok: true, report: pkg.visualStrategyReportJSON });
  }

  const selectedImages = pkg.items
    .filter((item) => item.selectedForDelivery)
    .map((item) => ({
      id: item.id,
      group: item.deliveryGroup,
      caption: item.clientFacingCaption,
      description: item.aiDescription,
      usageSuggestion: item.usageSuggestion,
      imagePurpose: item.imagePurpose,
      bestUseCase: item.aiBestUseCase,
      useCaseReasoning: item.aiUseCaseReasoning,
      performanceScore: item.performanceScore,
    }));
  const result = await generateVisualStrategyReport({
    project: {
      title: pkg.project.title,
      client: pkg.project.client,
      section: pkg.project.section,
      projectType: pkg.project.projectType,
      location: pkg.project.location,
      summary: pkg.project.summary,
      overview: pkg.project.overviewExtended,
      opening: pkg.project.opening,
      context: pkg.project.context,
      approach: pkg.project.approach,
      tags: pkg.project.tags,
    },
    client: pkg.client ? { name: pkg.client.companyName } : null,
    images: selectedImages,
  });

  const outputJSON = JSON.parse(JSON.stringify(result.json)) as Prisma.InputJsonObject;
  await prisma.deliveryPackage.update({
    where: { id: pkg.id },
    data: { visualStrategyReportJSON: outputJSON },
  });
  await prisma.aiGeneration.create({
    data: {
      projectId: pkg.projectId,
      generationType: "visual_strategy_report",
      promptMode: "client_package",
      inputBrief: { packageId: pkg.id, imageCount: selectedImages.length },
      outputJSON,
      modelUsed: result.model,
      createdBy: "client_package_token",
    },
  }).catch(() => null);
  await prisma.packageAccessLog.create({
    data: { deliveryPackageId: pkg.id, eventType: "visual_strategy_report_generated", ipAddress: ip, userAgent: req.headers.get("user-agent") },
  }).catch(() => null);

  return NextResponse.json({ ok: true, report: result.json });
}

