import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getPublicR2Url } from "@/lib/r2";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { analyzePortfolioPlacement } from "@/lib/ai/analyzePortfolioPlacement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip)) {
    return NextResponse.json(
      { ok: false, error: "Too many portfolio placement requests. Try again shortly." },
      { status: 429 }
    );
  }

  const { id: projectId } = await context.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const obj = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const requestedIds = Array.isArray(obj.mediaIds)
    ? obj.mediaIds.map(cleanString).filter((value): value is string => Boolean(value))
    : [];

  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    include: {
      media: {
        where: {
          media: { kind: "IMAGE" },
          ...(requestedIds.length ? { mediaId: { in: requestedIds } } : {}),
        },
        include: { media: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  }
  if (!project.media.length) {
    return NextResponse.json({ ok: false, error: "No project images found to analyze." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const recommendations = [];
  for (const item of project.media) {
    const key = item.media.keyFull ?? item.media.keyThumb;
    if (!key) continue;
    const result = await analyzePortfolioPlacement(
      {
        imageUrl: getPublicR2Url(key),
        projectContext: {
          clientName: project.client ?? undefined,
          projectTitle: project.title,
          pillar: project.section,
          location: project.location ?? undefined,
          whatWasPhotographed: project.whatWasPhotographed ?? undefined,
          visualApproach: project.visualApproach ?? undefined,
          altText: item.media.alt ?? undefined,
        },
      },
      origin
    );

    await prisma.projectMedia.update({
      where: { projectId_mediaId: { projectId, mediaId: item.mediaId } },
      data: result,
    });
    recommendations.push({ mediaId: item.mediaId, ...result });
  }

  const updated = await prisma.workProject.findUnique({
    where: { id: projectId },
    include: {
      heroMedia: true,
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ ok: true, recommendations, project: updated });
}

