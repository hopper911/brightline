import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, jsonOk } from "@/lib/api/http";
import {
  createDefaultPackageItems,
  createPackageAccessToken,
  packageInclude,
  resolveStudioClientIdForWorkProject,
} from "@/lib/delivery/db";
import { cleanText } from "@/lib/delivery/package";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseYmdUtc(value: string, endOfDay: boolean): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(
    Date.UTC(y, mo, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
  );
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const status = cleanText(url.searchParams.get("status"));
  const clientId = cleanText(url.searchParams.get("clientId"));
  const projectId = cleanText(url.searchParams.get("projectId"));
  const deliveryDateFrom = cleanText(url.searchParams.get("deliveryDateFrom"));
  const deliveryDateTo = cleanText(url.searchParams.get("deliveryDateTo"));
  const take = Math.min(Math.max(Number(url.searchParams.get("limit")) || 40, 1), 100);
  const skip = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const deliveryDateFilter: Prisma.DateTimeNullableFilter | undefined = (() => {
    const gte = deliveryDateFrom ? parseYmdUtc(deliveryDateFrom, false) : null;
    const lte = deliveryDateTo ? parseYmdUtc(deliveryDateTo, true) : null;
    if (!gte && !lte) return undefined;
    return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  })();

  const where = {
    ...(status ? { status } : {}),
    ...(clientId ? { clientId } : {}),
    ...(projectId ? { projectId } : {}),
    ...(deliveryDateFilter ? { deliveryDate: deliveryDateFilter } : {}),
  };

  const [packages, total] = await prisma.$transaction([
    prisma.deliveryPackage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      include: {
        project: { select: { id: true, title: true, slug: true, client: true, section: true } },
        client: { select: { id: true, companyName: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.deliveryPackage.count({ where }),
  ]);

  return jsonOk({ packages, total, hasMore: skip + packages.length < total });
}

export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonErr("Invalid JSON body.", 400);
  }

  const projectId = cleanText(body.projectId);
  const title = cleanText(body.title);
  if (!projectId) return jsonErr("projectId is required.", 400);
  if (!title) return jsonErr("title is required.", 400);

  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) return jsonErr("Work project not found.", 404);

  const clientId =
    cleanText(body.clientId) ?? (await resolveStudioClientIdForWorkProject(projectId));

  const genItems = body.seedItems !== false;

  let publicSlug: string | undefined;
  if (body.generatePublicSlug === true) {
    publicSlug = randomBytes(9).toString("base64url");
  } else {
    publicSlug = cleanText(body.publicSlug) ?? undefined;
  }

  if (publicSlug) {
    const clash = await prisma.deliveryPackage.findFirst({
      where: { publicSlug },
      select: { id: true },
    });
    if (clash) return jsonErr("publicSlug already in use.", 409);
  }

  const pkg = await prisma.deliveryPackage.create({
    data: {
      projectId,
      clientId: clientId ?? undefined,
      title,
      accessToken: createPackageAccessToken(),
      status: "draft",
      notes: cleanText(body.notes) ?? undefined,
      usageRights: cleanText(body.usageRights) ?? undefined,
      deliveryMessage: cleanText(body.deliveryMessage) ?? undefined,
      publicSlug,
    },
  });
  if (genItems) {
    await createDefaultPackageItems(pkg.id, projectId);
  }
  const created = await prisma.deliveryPackage.findUnique({
    where: { id: pkg.id },
    include: packageInclude(),
  });

  return jsonOk({ package: created });
}
