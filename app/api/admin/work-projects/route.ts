import { NextResponse } from "next/server";
import type { WorkSection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";
import {
  getPillarBySlug,
  isPillarSlug,
  PILLAR_TO_SECTION,
  WORK_SECTIONS,
} from "@/lib/portfolioPillars";

export const runtime = "nodejs";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const url = new URL(req.url);
    const pillarParam = url.searchParams.get("pillar");
    const sectionParam = url.searchParams.get("section");

    let whereSection: { section: WorkSection } | { section: { in: WorkSection[] } } | undefined;
    if (pillarParam && isPillarSlug(pillarParam)) {
      const p = getPillarBySlug(pillarParam);
      whereSection = p && p.sections.length > 0
        ? { section: { in: p.sections } }
        : undefined;
    } else if (sectionParam && WORK_SECTIONS.includes(sectionParam as WorkSection)) {
      whereSection = { section: sectionParam as WorkSection };
    }

    const projects = await prisma.workProject.findMany({
      where: whereSection,
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: [
        { section: "asc" },
        { sortOrder: "asc" },
        { year: "desc" },
        { createdAt: "desc" },
      ],
    });
    return NextResponse.json({ ok: true, projects });
  } catch (err: unknown) {
    console.error("WORK_PROJECTS_GET_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to load work projects.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    let body: {
      pillar?: string;
      section?: string;
      title?: string;
      slug?: string;
      summary?: string;
      description?: string;
      location?: string;
      year?: number;
      published?: boolean;
      isFeatured?: boolean;
      sortOrder?: number;
      heroKeyFull?: string;
      heroAlt?: string;
    };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    if (!body.title) {
      return NextResponse.json(
        { ok: false, error: "title is required." },
        { status: 400 }
      );
    }

    let section: WorkSection;
    if (body.pillar && isPillarSlug(body.pillar)) {
      section = PILLAR_TO_SECTION[body.pillar];
    } else if (body.section && WORK_SECTIONS.includes(body.section as WorkSection)) {
      section = body.section as WorkSection;
    } else {
      return NextResponse.json(
        { ok: false, error: "pillar (architecture, campaign, corporate) or section is required." },
        { status: 400 }
      );
    }

    const slug = (body.slug?.trim() || slugify(body.title)).replace(/^-+|-+$/g, "") || "project";

    const existing = await prisma.workProject.findUnique({
      where: { section_slug: { section, slug } },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: `A project with slug "${slug}" already exists in this section.` },
        { status: 409 }
      );
    }

    let heroMediaId: string | null = null;
    if (body.heroKeyFull?.trim()) {
      const hero = await prisma.mediaAsset.create({
        data: {
          kind: "IMAGE",
          keyFull: body.heroKeyFull.trim(),
          alt: body.heroAlt?.trim() || null,
        },
      });
      heroMediaId = hero.id;
    }

    const project = await prisma.workProject.create({
      data: {
        section,
        title: body.title.trim(),
        slug,
        summary: body.summary?.trim() || null,
        description: body.description?.trim() || null,
        location: body.location?.trim() || null,
        year: typeof body.year === "number" ? body.year : null,
        published: Boolean(body.published),
        isFeatured: Boolean(body.isFeatured),
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
        heroMediaId,
      },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    if (heroMediaId) {
      await prisma.projectMedia.create({
        data: { projectId: project.id, mediaId: heroMediaId, sortOrder: 0 },
      });
    }

    return NextResponse.json({ ok: true, project });
  } catch (err: unknown) {
    console.error("WORK_PROJECTS_POST_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to create work project.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
