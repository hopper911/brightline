import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashAccessCode } from "@/lib/client-access";

export const runtime = "nodejs";

const WORK_SECTIONS = ["ACD", "REA", "CUL", "BIZ", "TRI"] as const;

/**
 * Dev-only seed endpoint for creating demo data.
 * Protected by SEED_TOKEN environment variable.
 *
 * Usage: POST /api/admin/seed with header `Authorization: Bearer YOUR_SEED_TOKEN`
 * Optional: `?type=work` to seed only Work projects.
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
          title: "Demo Hospitality Project",
          slug: "demo-project",
          description: "A sample hospitality photography project for testing the client portal.",
          category: "Hospitality",
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

    for (const section of WORK_SECTIONS) {
      const slug = `demo-${section.toLowerCase()}`;
      const existing = await prisma.workProject.findFirst({
        where: { section, slug },
      });
      if (existing) continue;

      const media = await prisma.mediaAsset.create({
        data: {
          kind: "IMAGE",
          alt: `Demo ${section} hero`,
          keyFull: "work/demo/placeholder.jpg",
        },
      });

      const wp = await prisma.workProject.create({
        data: {
          section,
          title: `Demo ${section} Project`,
          slug,
          summary: `A sample project for ${section}. Add real content via Admin or seed payload.`,
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
