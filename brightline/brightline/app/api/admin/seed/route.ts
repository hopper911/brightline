import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAccessCode } from "@/lib/client-access";
import { getPillarBySlug, PILLAR_SLUGS, PILLAR_TO_SECTION } from "@/lib/portfolioPillars";

export const runtime = "nodejs";

/**
 * Dev-only seed endpoint for creating demo data.
 * Protected by SEED_TOKEN environment variable.
 *
 * Usage: POST /api/admin/seed with header `Authorization: Bearer YOUR_SEED_TOKEN`
 * Optional: `?type=work` to seed only Work projects.
 * Optional: `?type=work-starter` to create one editable project per pillar (no demo images).
 */
export async function POST(req: Request) {
  const seedToken = process.env.SEED_TOKEN;
  if (!seedToken) {
    return new Response(null, { status: 404 });
  }

  const authHeader = req.headers.get("authorization");
  const providedToken = authHeader?.replace("Bearer ", "").trim();
  if (providedToken !== seedToken) {
    return new Response(null, { status: 404 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  try {
    const workResults: { section: string; projectId: string; slug: string }[] = [];

    if (type === "work-starter") {
      for (const pillarSlug of PILLAR_SLUGS) {
        const pillar = getPillarBySlug(pillarSlug);
        const section = PILLAR_TO_SECTION[pillarSlug];
        const slug = "showcase";
        const existing = await prisma.workProject.findFirst({
          where: { section, slug },
        });
        if (existing) continue;

        const label = pillar?.label ?? pillarSlug;
        const wp = await prisma.workProject.create({
          data: {
            section,
            title: label,
            slug,
            summary: `Add your ${label} imagery. Upload from R2 via Admin.`,
            location: null,
            year: new Date().getFullYear(),
            published: true,
            heroMediaId: null,
          },
        });

        workResults.push({ section, projectId: wp.id, slug });
      }

      return NextResponse.json({
        ok: true,
        message: "Work starter projects created",
        data: { workProjects: workResults },
      });
    }

    if (type !== "work") {
      let client = await prisma.client.findFirst({
        where: { email: "demo@example.com" },
      });
      if (!client) {
        client = await prisma.client.create({
          data: {
            name: "Demo Client",
            email: "demo@example.com",
            company: "Demo Company",
          },
        });
      }

      const project = await prisma.project.upsert({
        where: { slug: "demo-project" },
        update: {},
        create: {
          title: "Demo Architecture Project",
          slug: "demo-project",
          description: "A sample architecture photography project for testing the client portal.",
          category: "Architecture",
          location: "Miami, FL",
          year: "2025",
          clientId: client.id,
          published: true,
        },
      });

      const gallery = await prisma.gallery.upsert({
        where: { slug: "demo-gallery" },
        update: {},
        create: {
          title: "Demo Gallery",
          slug: "demo-gallery",
          description: "Sample gallery for testing client access.",
          clientNotes: "Thank you for reviewing!",
          clientId: client.id,
          projectId: project.id,
          published: true,
        },
      });

      const imageUrls = [
        "/work/hotel-01/cover.svg",
        "/work/hotel-01/detail-01.svg",
        "/work/hotel-01/detail-02.svg",
      ];
      for (let i = 0; i < imageUrls.length; i++) {
        await prisma.galleryImage.upsert({
          where: { id: `demo-image-${i}` },
          update: { url: imageUrls[i], sortOrder: i },
          create: {
            id: `demo-image-${i}`,
            galleryId: gallery.id,
            url: imageUrls[i],
            alt: `Demo image ${i + 1}`,
            sortOrder: i,
          },
        });
      }

      const accessCode = `DEMO-${Date.now().toString(36).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const hashed = hashAccessCode(accessCode);
      await prisma.galleryAccessToken.create({
        data: {
          galleryId: gallery.id,
          codeHash: hashed.hash,
          codeSalt: hashed.salt,
          codeHint: hashed.hint,
          label: "Demo Access",
          expiresAt,
          allowDownload: true,
          isActive: true,
        },
      });
    }

    for (const pillarSlug of PILLAR_SLUGS) {
      const pillar = getPillarBySlug(pillarSlug);
      const section = PILLAR_TO_SECTION[pillarSlug];
      const slug = `demo-${pillarSlug}`;
      const existing = await prisma.workProject.findFirst({
        where: { section, slug },
      });
      if (existing) continue;

      const label = pillar?.label ?? pillarSlug;
      const media = await prisma.mediaAsset.create({
        data: {
          kind: "IMAGE",
          alt: `${label} hero`,
          keyFull: "work/demo/placeholder.jpg",
        },
      });

      const wp = await prisma.workProject.create({
        data: {
          section,
          title: `${label} - Sample`,
          slug,
          summary: `A sample project for ${label}. Add real projects via Admin.`,
          location: "New York, NY",
          year: new Date().getFullYear(),
          published: true,
          heroMediaId: media.id,
        },
      });

      await prisma.projectMedia.create({
        data: {
          projectId: wp.id,
          mediaId: media.id,
          sortOrder: 0,
        },
      });

      workResults.push({ section, projectId: wp.id, slug });
    }

    return NextResponse.json({
      ok: true,
      message: "Seed completed",
      data: { workProjects: workResults },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to seed demo data." },
      { status: 500 }
    );
  }
}
