import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { WORK_SECTIONS } from "@/lib/portfolioPillars";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import type { WorkSection } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(req.url);
    const sectionParam = url.searchParams.get("section");
    const typeParam = url.searchParams.get("type");
    const projectIdParam = url.searchParams.get("projectId");
    const searchParam = url.searchParams.get("search")?.trim().toLowerCase() ?? "";

    const sectionMap = await getSectionToPillarSlugMap();

    const whereSection: { section?: WorkSection | { in: WorkSection[] } } = {};
    if (sectionParam?.trim()) {
      const slug = sectionParam.trim().toLowerCase();
      const sections = WORK_SECTIONS.filter((s) => sectionMap[s] === slug);
      if (sections.length > 0) {
        whereSection.section = { in: sections };
      }
    }

    const whereKind =
      typeParam === "video"
        ? { kind: "VIDEO" as const }
        : typeParam === "image"
          ? { kind: "IMAGE" as const }
          : {};

    const projectMedia = await prisma.projectMedia.findMany({
      where: {
        project: {
          ...(Object.keys(whereSection).length > 0 ? whereSection : {}),
          ...(projectIdParam?.trim() ? { id: projectIdParam.trim() } : {}),
        },
        media: whereKind,
      },
      include: {
        media: true,
        project: {
          select: { id: true, title: true, slug: true, section: true },
        },
      },
      orderBy: [{ project: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    let items = projectMedia.map((pm) => ({
      id: pm.media.id,
      kind: pm.media.kind,
      keyFull: pm.media.keyFull,
      keyThumb: pm.media.keyThumb,
      alt: pm.media.alt,
      projectId: pm.project.id,
      projectTitle: pm.project.title,
      projectSlug: pm.project.slug,
      pillarSlug: sectionMap[pm.project.section],
    }));

    if (searchParam) {
      items = items.filter((item) => {
        const key = item.keyFull ?? item.keyThumb ?? "";
        const filename = key.split("/").pop() ?? "";
        return (
          key.toLowerCase().includes(searchParam) || filename.toLowerCase().includes(searchParam)
        );
      });
    }

    const projects = await prisma.workProject.findMany({
      where: Object.keys(whereSection).length > 0 ? whereSection : undefined,
      select: { id: true, title: true, slug: true, section: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    const projectOptions = projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      pillarSlug: sectionMap[p.section],
    }));

    return NextResponse.json({
      ok: true,
      items,
      projects: projectOptions,
    });
  } catch (err: unknown) {
    console.error("ADMIN_MEDIA_GET_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to load media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
