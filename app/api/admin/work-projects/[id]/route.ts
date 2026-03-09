import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await hasAdminAccess();
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
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = (await req.json()) as {
      title?: string;
      slug?: string;
      summary?: string;
      description?: string;
      location?: string;
      year?: number;
      published?: boolean;
      isFeatured?: boolean;
      sortOrder?: number;
      heroMediaId?: string | null;
    };

    const existing = await prisma.workProject.findUnique({
      where: { id },
      include: { heroMedia: true, media: { include: { media: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    if (body.slug !== undefined) {
      const slug = (body.slug.trim() || slugify(existing.title)).replace(/^-+|-+$/g, "") || "project";
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
            ? (body.slug.trim() || slugify(existing.title)).replace(/^-+|-+$/g, "") || "project"
            : undefined,
        summary: body.summary !== undefined ? (body.summary.trim() || null) : undefined,
        description: body.description !== undefined ? (body.description.trim() || null) : undefined,
        location: body.location !== undefined ? (body.location.trim() || null) : undefined,
        year: body.year !== undefined ? (typeof body.year === "number" ? body.year : null) : undefined,
        published: typeof body.published === "boolean" ? body.published : undefined,
        isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : undefined,
        sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
        heroMediaId: body.heroMediaId !== undefined ? body.heroMediaId : undefined,
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
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await hasAdminAccess();
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
