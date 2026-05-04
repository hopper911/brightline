import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDeliveryManifest } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const project = await prisma.workProject.findUnique({
    where: { finalPackageToken: token },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  }
  const manifest = await buildDeliveryManifest(project.id);
  return NextResponse.json({ ok: true, manifest });
}

