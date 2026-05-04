import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { projectId } = await context.params;
  const items = await prisma.deliveryPackageItem.findMany({
    where: { deliveryPackage: { projectId } },
    include: {
      mediaAsset: true,
      deliveryPackage: { select: { id: true, title: true, status: true } },
    },
    orderBy: [{ performanceScore: "desc" }, { downloadCount: "desc" }],
    take: 200,
  });

  const topPerforming = items.slice(0, 8);
  const mostDownloaded = [...items]
    .sort((a, b) => b.downloadCount - a.downloadCount || b.performanceScore - a.performanceScore)
    .slice(0, 8);
  const unusedHighValue = items
    .filter((item) => item.performanceScore >= 55 && item.downloadCount === 0)
    .slice(0, 8);

  return NextResponse.json({
    ok: true,
    topPerforming,
    mostDownloaded,
    unusedHighValue,
  });
}

