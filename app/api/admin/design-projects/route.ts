import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeDisciplines,
  normalizeSpecimenBlocks,
} from "@/lib/design-section-settings";

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

const listInclude = {
  coverMedia: {
    select: { id: true, alt: true, keyFull: true, keyThumb: true, kind: true },
  },
  relatedWorkProject: { select: { id: true, title: true, slug: true } },
} as const;

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const published = url.searchParams.get("published");

  const projects = await prisma.designProject.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { clientName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(published === "true" ? { published: true } : {}),
      ...(published === "false" ? { published: false } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    include: listInclude,
  });

  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
  }

  let slug =
    typeof body.slug === "string" && body.slug.trim()
      ? slugify(body.slug)
      : slugify(title);
  if (!slug) slug = `design-${Date.now()}`;

  const existing = await prisma.designProject.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "Slug already in use." }, { status: 409 });
  }

  const project = await prisma.designProject.create({
    data: {
      title,
      slug,
      summary: typeof body.summary === "string" ? body.summary.trim() || null : null,
      year:
        typeof body.year === "number" && Number.isFinite(body.year)
          ? Math.round(body.year)
          : null,
      published: typeof body.published === "boolean" ? body.published : false,
      featured: typeof body.featured === "boolean" ? body.featured : false,
      disciplines: normalizeDisciplines(body.disciplines),
      specimenBlocks: [],
    },
    include: listInclude,
  });

  return NextResponse.json({ ok: true, project });
}
