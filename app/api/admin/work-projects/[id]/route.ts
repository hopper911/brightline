import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";

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
      },
    });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, project });
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
      tags?: string[];
    };

    const existing = await prisma.workProject.findUnique({
      where: { id },
      include: { heroMedia: true, media: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    if (body.slug !== undefined) {
      const slugInput = body.slug == null ? "" : String(body.slug).trim();
      const slug =
        (slugInput || slugify(existing.title)).replace(/^-+|-+$/g, "") || "project";
      const conflict = await prisma.workProject.findFirst({
        where: { section: existing.section, slug, id: { not: id } },
      });
      if (conflict) {
        return NextResponse.json(
          { ok: false, error: `Another project in this section already uses slug "${slug}".` },
          { status: 409 }
        );
      }
    }

    const project = await prisma.workProject.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title.trim() : undefined,
        slug:
          body.slug !== undefined
            ? ((body.slug == null ? "" : String(body.slug).trim()) || slugify(existing.title))
                .replace(/^-+|-+$/g, "")
                || "project"
            : undefined,
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
      },
    });

    return NextResponse.json({ ok: true, project });
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
