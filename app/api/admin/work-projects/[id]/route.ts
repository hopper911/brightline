import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  getPillarBySlug,
  getPrimaryWorkSection,
  getSectionToPillarSlugMap,
} from "@/lib/work-pillar-settings";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await context.params;
    const project = await prisma.workProject.findUnique({
      where: { id },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
        followUpSchedules: { orderBy: { scheduledAt: "asc" } },
      },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      project,
      sectionToPillar: await getSectionToPillarSlugMap(),
    });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_GET_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to load project.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const COPY_VERSION_FIELDS = [
  ["client", "client"],
  ["projectType", "projectTypeLegacy"],
  ["scope", "scope"],
  ["overviewExtended", "overviewExtended"],
  ["whatWasPhotographed", "whatWasPhotographed"],
  ["visualApproach", "visualApproachLegacy"],
  ["locationContext", "locationContext"],
  ["whoIsThisFor", "whoThisPhotographyServes"],
  ["seoTitle", "seoTitle"],
  ["metaDescription", "metaDescription"],
  ["ctaCopy", "ctaCopy"],
  ["opening", "opening"],
  ["context", "context"],
  ["approach", "approach"],
  ["highlight", "highlightLine"],
  ["execution", "execution"],
  ["closing", "closing"],
  ["credits", "credits"],
] as const;

function cleanCopyValue(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  if (value == null) return "";
  return String(value).trim();
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await req.json()) as {
      title?: string;
      slug?: string | null;
      summary?: string | null;
      description?: string | null;
      location?: string | null;
      year?: number | null;
      published?: boolean;
      isFeatured?: boolean;
      sortOrder?: number;
      heroMediaId?: string | null;
      backgroundMediaUrl?: string | null;
      backgroundPosterUrl?: string | null;
      client?: string | null;
      projectType?: string | null;
      scope?: string | null;
      overviewExtended?: string | null;
      whatWasPhotographed?: string | null;
      visualApproach?: string | null;
      locationContext?: string | null;
      whoIsThisFor?: string | null;
      seoTitle?: string | null;
      metaDescription?: string | null;
      ctaCopy?: string | null;
      opening?: string | null;
      context?: string | null;
      approach?: string | null;
      highlight?: string | null;
      execution?: string | null;
      closing?: string | null;
      credits?: string | null;
      relatedServicesEnabled?: boolean;
      relatedServicesIntro?: string | null;
      relatedServicesLinks?: { slug: string; title: string }[] | null;
      showRelatedContactButton?: boolean;
      galleryCarouselEnabled?: boolean;
      galleryBlocks?: unknown;
      storyChapters?: unknown;
      tags?: string[];
      /** Pillar slug from Admin → Work pillars; moves project to that pillar's primary work section. */
      pillar?: string | null;
    };

    const existing = await prisma.workProject.findUnique({
      where: { id },
      include: { heroMedia: true, media: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    let nextSection = existing.section;
    if (body.pillar !== undefined) {
      const raw = body.pillar == null ? "" : String(body.pillar).trim().toLowerCase();
      if (!raw) {
        return NextResponse.json(
          { ok: false, error: "Choose a pillar (slug cannot be empty)." },
          { status: 400 }
        );
      }
      const pillarCfg = await getPillarBySlug(raw);
      if (!pillarCfg?.sections.length) {
        return NextResponse.json(
          { ok: false, error: "Unknown pillar. Configure it under Admin → Work pillars." },
          { status: 400 }
        );
      }
      nextSection = getPrimaryWorkSection(pillarCfg);
    }

    const titleForSlug =
      body.title !== undefined ? body.title.trim() : existing.title;
    let finalSlug = existing.slug;
    if (body.slug !== undefined) {
      const slugInput = body.slug == null ? "" : String(body.slug).trim();
      finalSlug =
        slugify(slugInput || slugify(titleForSlug)).replace(/^-+|-+$/g, "") || "project";
    }

    const conflict = await prisma.workProject.findFirst({
      where: {
        section: nextSection,
        slug: { equals: finalSlug, mode: "insensitive" },
        id: { not: id },
      },
    });
    if (conflict) {
      return NextResponse.json(
        {
          ok: false,
          error: `Another project in this pillar already uses slug "${finalSlug}".`,
        },
        { status: 409 }
      );
    }

    const project = await prisma.workProject.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        section: nextSection !== existing.section ? nextSection : undefined,
        slug: body.slug !== undefined ? finalSlug : undefined,
        summary:
          body.summary !== undefined
            ? body.summary == null
              ? null
              : String(body.summary).trim() || null
            : undefined,
        description:
          body.description !== undefined
            ? body.description == null
              ? null
              : String(body.description).trim() || null
            : undefined,
        location:
          body.location !== undefined
            ? body.location == null
              ? null
              : String(body.location).trim() || null
            : undefined,
        year:
          body.year !== undefined
            ? typeof body.year === "number" && Number.isFinite(body.year)
              ? body.year
              : null
            : undefined,
        published: typeof body.published === "boolean" ? body.published : undefined,
        isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : undefined,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        heroMediaId: body.heroMediaId !== undefined ? body.heroMediaId : undefined,
        backgroundMediaUrl:
          body.backgroundMediaUrl !== undefined
            ? body.backgroundMediaUrl == null
              ? null
              : String(body.backgroundMediaUrl).trim() || null
            : undefined,
        backgroundPosterUrl:
          body.backgroundPosterUrl !== undefined
            ? body.backgroundPosterUrl == null
              ? null
              : String(body.backgroundPosterUrl).trim() || null
            : undefined,
        client: body.client !== undefined ? (body.client == null ? null : String(body.client).trim() || null) : undefined,
        projectType: body.projectType !== undefined ? (body.projectType == null ? null : String(body.projectType).trim() || null) : undefined,
        scope: body.scope !== undefined ? (body.scope == null ? null : String(body.scope).trim() || null) : undefined,
        overviewExtended: body.overviewExtended !== undefined ? (body.overviewExtended == null ? null : String(body.overviewExtended).trim() || null) : undefined,
        whatWasPhotographed: body.whatWasPhotographed !== undefined ? (body.whatWasPhotographed == null ? null : String(body.whatWasPhotographed).trim() || null) : undefined,
        visualApproach: body.visualApproach !== undefined ? (body.visualApproach == null ? null : String(body.visualApproach).trim() || null) : undefined,
        locationContext: body.locationContext !== undefined ? (body.locationContext == null ? null : String(body.locationContext).trim() || null) : undefined,
        whoIsThisFor: body.whoIsThisFor !== undefined ? (body.whoIsThisFor == null ? null : String(body.whoIsThisFor).trim() || null) : undefined,
        seoTitle: body.seoTitle !== undefined ? (body.seoTitle == null ? null : String(body.seoTitle).trim() || null) : undefined,
        metaDescription: body.metaDescription !== undefined ? (body.metaDescription == null ? null : String(body.metaDescription).trim() || null) : undefined,
        ctaCopy: body.ctaCopy !== undefined ? (body.ctaCopy == null ? null : String(body.ctaCopy).trim() || null) : undefined,
        opening:
          body.opening !== undefined
            ? body.opening == null
              ? null
              : String(body.opening).trim() || null
            : undefined,
        context:
          body.context !== undefined
            ? body.context == null
              ? null
              : String(body.context).trim() || null
            : undefined,
        approach:
          body.approach !== undefined
            ? body.approach == null
              ? null
              : String(body.approach).trim() || null
            : undefined,
        highlight:
          body.highlight !== undefined
            ? body.highlight == null
              ? null
              : String(body.highlight).trim() || null
            : undefined,
        execution:
          body.execution !== undefined
            ? body.execution == null
              ? null
              : String(body.execution).trim() || null
            : undefined,
        closing:
          body.closing !== undefined
            ? body.closing == null
              ? null
              : String(body.closing).trim() || null
            : undefined,
        credits:
          body.credits !== undefined
            ? body.credits == null
              ? null
              : String(body.credits).trim() || null
            : undefined,
        relatedServicesEnabled:
          body.relatedServicesEnabled !== undefined
            ? Boolean(body.relatedServicesEnabled)
            : undefined,
        galleryCarouselEnabled:
          body.galleryCarouselEnabled !== undefined
            ? Boolean(body.galleryCarouselEnabled)
            : undefined,
        galleryBlocks:
          body.galleryBlocks !== undefined
            ? (Array.isArray(body.galleryBlocks) ? body.galleryBlocks : [])
            : undefined,
        storyChapters:
          body.storyChapters !== undefined
            ? (Array.isArray(body.storyChapters) ? body.storyChapters : [])
            : undefined,
        relatedServicesIntro:
          body.relatedServicesIntro !== undefined
            ? body.relatedServicesIntro == null
              ? null
              : String(body.relatedServicesIntro).trim() || null
            : undefined,
        relatedServicesLinks:
          body.relatedServicesLinks !== undefined
            ? body.relatedServicesLinks == null
              ? Prisma.JsonNull
              : Array.isArray(body.relatedServicesLinks)
                ? body.relatedServicesLinks
                    .map((link) => ({
                      slug: String(link?.slug ?? "").trim(),
                      title: String(link?.title ?? "").trim(),
                    }))
                    .filter((link) => link.slug && link.title)
                : undefined
            : undefined,
        showRelatedContactButton:
          body.showRelatedContactButton !== undefined
            ? Boolean(body.showRelatedContactButton)
            : undefined,
        tags:
          body.tags !== undefined
            ? Array.isArray(body.tags)
              ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 48)
              : undefined
            : undefined,
      },
      include: {
        heroMedia: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
        followUpSchedules: { orderBy: { scheduledAt: "asc" } },
      },
    });

    const manualVersions: Array<{
      projectId: string;
      fieldKey: string;
      oldValue: string | null;
      newValue: string | null;
      promptMode: string;
    }> = COPY_VERSION_FIELDS.flatMap(([bodyKey, fieldKey]) => {
      if (!(bodyKey in body)) return [];
      const oldValue = cleanCopyValue(existing[bodyKey]);
      const newValue = cleanCopyValue(body[bodyKey]);
      if (oldValue === newValue) return [];
      return [{ projectId: id, fieldKey, oldValue: oldValue || null, newValue: newValue || null, promptMode: "manual_save" }];
    });
    if ("tags" in body) {
      const oldValue = cleanCopyValue(existing.tags);
      const newValue = cleanCopyValue(body.tags);
      if (oldValue !== newValue) {
        manualVersions.push({
          projectId: id,
          fieldKey: "projectTags",
          oldValue: oldValue || null,
          newValue: newValue || null,
          promptMode: "manual_save",
        });
      }
    }
    if (manualVersions.length) {
      await prisma.projectCopyVersion.createMany({ data: manualVersions });
    }

    return NextResponse.json({
      ok: true,
      project,
      sectionToPillar: await getSectionToPillarSlugMap(),
    });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_PATCH_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to update project.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await context.params;

    const existing = await prisma.workProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    await prisma.workProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("WORK_PROJECT_DELETE_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to delete project.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
