import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { normalizePackageStatus, packageInclude, serializePackageManifest } from "@/lib/delivery/db";
import { cleanText } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { packageId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const existing = await prisma.deliveryPackage.findUnique({ where: { id: packageId }, include: packageInclude() });
  if (!existing) return NextResponse.json({ ok: false, error: "Delivery package not found." }, { status: 404 });
  const status = normalizePackageStatus(body.status);
  const manifest = body.rebuildManifest ? serializePackageManifest(existing) : body.manifestJSON;

  const updated = await prisma.deliveryPackage.update({
    where: { id: packageId },
    data: {
      title: body.title !== undefined ? cleanText(body.title) ?? existing.title : undefined,
      status,
      notes: body.notes !== undefined ? cleanText(body.notes) : undefined,
      expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(String(body.expiresAt)) : null) : undefined,
      deliveryDate: body.deliveryDate !== undefined ? (body.deliveryDate ? new Date(String(body.deliveryDate)) : null) : undefined,
      manifestJSON: manifest === undefined ? undefined : manifest ?? undefined,
    },
    include: packageInclude(),
  });

  return NextResponse.json({ ok: true, package: updated });
}

