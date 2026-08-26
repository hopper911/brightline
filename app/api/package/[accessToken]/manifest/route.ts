import { headers } from "next/headers";
import { jsonErr, jsonOk } from "@/lib/api/http";
import { prisma } from "@/lib/prisma";
import { serializePackageManifest, packageInclude } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  const { accessToken } = await context.params;
  const pkg = await prisma.deliveryPackage.findUnique({
    where: { accessToken },
    include: packageInclude(),
  });
  if (!pkg || (pkg.expiresAt && pkg.expiresAt.getTime() < Date.now())) {
    return jsonErr("Package not found.", 404);
  }
  const h = await headers();
  await prisma.packageAccessLog
    .create({
      data: {
        deliveryPackageId: pkg.id,
        eventType: "package_downloaded",
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent"),
      },
    })
    .catch(() => null);
  return jsonOk({ manifest: serializePackageManifest(pkg) });
}
