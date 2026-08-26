import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeDisciplines,
  normalizeSpecimenBlocks,
} from "@/lib/design-section-settings";
import { normalizeCaseStudy } from "@/lib/design/case-study";
import { normalizeDesignPortfolioStatus, isDesignPortfolioStatus } from "@/lib/design/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const detailInclude = {
  coverMedia: {
    select: { id: true, alt: true, keyFull: true, keyThumb: true, kind: true },
  },
  relatedWorkProject: {
    select: { id: true, title: true, slug: true, section: true, published: true },
  },
} as const;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const project = await prisma.designProject.findUnique({
    where: { id },
    include: detailInclude,
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, project });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const existing = await prisma.designProject.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : existing.title;

  let slug = existing.slug;
  if (typeof body.slug === "string" && body.slug.trim()) {
    slug = slugify(body.slug);
    if (!slug) slug = existing.slug;
    if (slug !== existing.slug) {
      const clash = await prisma.designProject.findUnique({ where: { slug } });
      if (clash) {
        return NextResponse.json({ ok: false, error: "Slug already in use." }, { status: 409 });
      }
    }
  }

  const coverMediaId =
    body.coverMediaId === null
      ? null
      : typeof body.coverMediaId === "string" && body.coverMediaId.trim()
        ? body.coverMediaId.trim()
        : undefined;

  const relatedWorkProjectId =
    body.relatedWorkProjectId === null
      ? null
      : typeof body.relatedWorkProjectId === "string" && body.relatedWorkProjectId.trim()
        ? body.relatedWorkProjectId.trim()
        : undefined;

  const project = await prisma.designProject.update({
    where: { id },
    data: {
      title,
      slug,
      summary:
        typeof body.summary === "string" ? body.summary.trim() || null : undefined,
      brief: typeof body.brief === "string" ? body.brief.trim() || null : undefined,
      approach:
        typeof body.approach === "string" ? body.approach.trim() || null : undefined,
      outcome:
        typeof body.outcome === "string" ? body.outcome.trim() || null : undefined,
      year:
        body.year === null
          ? null
          : typeof body.year === "number" && Number.isFinite(body.year)
            ? Math.round(body.year)
            : undefined,
      clientName:
        typeof body.clientName === "string" ? body.clientName.trim() || null : undefined,
      role: typeof body.role === "string" ? body.role.trim() || null : undefined,
      disciplines:
        body.disciplines !== undefined ? normalizeDisciplines(body.disciplines) : undefined,
      published: typeof body.published === "boolean" ? body.published : undefined,
      featured: typeof body.featured === "boolean" ? body.featured : undefined,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.round(body.sortOrder)
          : undefined,
      coverMediaId,
      specimenBlocks:
        body.specimenBlocks !== undefined
          ? normalizeSpecimenBlocks(body.specimenBlocks)
          : undefined,
      relatedWorkProjectId,
      relatedServicesEnabled:
        typeof body.relatedServicesEnabled === "boolean"
          ? body.relatedServicesEnabled
          : undefined,
      relatedServicesIntro:
        typeof body.relatedServicesIntro === "string"
          ? body.relatedServicesIntro.trim() || null
          : undefined,
      relatedServicesLinks:
        body.relatedServicesLinks === null
          ? Prisma.JsonNull
          : body.relatedServicesLinks !== undefined
            ? (body.relatedServicesLinks as Prisma.InputJsonValue)
            : undefined,
      seoTitle:
        typeof body.seoTitle === "string" ? body.seoTitle.trim() || null : undefined,
      seoDescription:
        typeof body.seoDescription === "string"
          ? body.seoDescription.trim() || null
          : undefined,
      problemStatement:
        typeof body.problemStatement === "string"
          ? body.problemStatement.trim() || null
          : undefined,
      timelineLabel:
        typeof body.timelineLabel === "string" ? body.timelineLabel.trim() || null : undefined,
      teamLabel: typeof body.teamLabel === "string" ? body.teamLabel.trim() || null : undefined,
      platformLabel:
        typeof body.platformLabel === "string" ? body.platformLabel.trim() || null : undefined,
      toolsLabel: typeof body.toolsLabel === "string" ? body.toolsLabel.trim() || null : undefined,
      industryLabel:
        typeof body.industryLabel === "string" ? body.industryLabel.trim() || null : undefined,
      projectTypeLabel:
        typeof body.projectTypeLabel === "string"
          ? body.projectTypeLabel.trim() || null
          : undefined,
      yearEnd:
        body.yearEnd === null
          ? null
          : typeof body.yearEnd === "number" && Number.isFinite(body.yearEnd)
            ? Math.round(body.yearEnd)
            : undefined,
      status: isDesignPortfolioStatus(body.status)
        ? normalizeDesignPortfolioStatus(body.status)
        : undefined,
      caseStudy:
        body.caseStudy !== undefined
          ? (normalizeCaseStudy(body.caseStudy) as Prisma.InputJsonValue)
          : undefined,
      ogImageKey:
        body.ogImageKey === null
          ? null
          : typeof body.ogImageKey === "string"
            ? body.ogImageKey.trim() || null
            : undefined,
      publishedAt:
        typeof body.published === "boolean"
          ? body.published
            ? existing.publishedAt ?? new Date()
            : null
          : undefined,
    },
    include: detailInclude,
  });

  return NextResponse.json({ ok: true, project });
}

export async function DELETE(req: Request, ctx: Ctx) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    await prisma.designProject.delete({ where: { id } });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
