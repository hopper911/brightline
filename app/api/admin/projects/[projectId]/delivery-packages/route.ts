import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  createDefaultPackageItems,
  createPackageAccessToken,
  packageInclude,
  resolveStudioClientIdForWorkProject,
} from "@/lib/delivery/db";
import { cleanText } from "@/lib/delivery/package";

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
  const packages = await prisma.deliveryPackage.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: packageInclude(),
  });
  return NextResponse.json({ ok: true, packages });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { projectId } = await context.params;
  const project = await prisma.workProject.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const clientId = cleanText(body.clientId) ?? (await resolveStudioClientIdForWorkProject(projectId));
  const pkg = await prisma.deliveryPackage.create({
    data: {
      projectId,
      clientId,
      title: cleanText(body.title) ?? `${project.title} Final Delivery`,
      status: "draft",
      accessToken: createPackageAccessToken(),
      deliveryDate: body.deliveryDate ? new Date(String(body.deliveryDate)) : new Date(),
      notes: cleanText(body.notes),
    },
  });
  await createDefaultPackageItems(pkg.id, projectId);
  const full = await prisma.deliveryPackage.findUnique({ where: { id: pkg.id }, include: packageInclude() });
  return NextResponse.json({ ok: true, package: full });
}

