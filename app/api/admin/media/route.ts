import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin-auth";
import { SECTION_TO_PILLAR, isPillarSlug } from "@/lib/portfolioPillars";
import type { WorkSection } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(req.url);
    const sectionParam = url.searchParams.get("section");
    const typeParam = url.searchParams.get("type");
    const projectIdParam = url.searchParams.get("projectId");
    const searchParam = url.searchParams.get("search")?.trim().toLowerCase() ?? "";

    const whereSection: { section?: WorkSection | { in: WorkSection[] } } = {};
    if (sectionParam && isPillarSlug(sectionParam)) {
      const sections = (["ACD", "REA", "CUL", "BIZ", "TRI"] as WorkSection[]).filter(
        (s) => SECTION_TO_PILLAR[s] === sectionParam
      );
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
      pillarSlug: SECTION_TO_PILLAR[pm.project.section],
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
      pillarSlug: SECTION_TO_PILLAR[p.section],
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
