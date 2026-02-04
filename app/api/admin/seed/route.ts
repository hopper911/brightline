import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Dev-only seed endpoint for creating demo client portal data.
 * Protected by SEED_TOKEN environment variable.
 * 
 * Usage: POST /api/admin/seed with header `Authorization: Bearer YOUR_SEED_TOKEN`
 */
export async function POST(req: Request) {
  // Only allow in development or with SEED_TOKEN
  const seedToken = process.env.SEED_TOKEN;
  
  if (!seedToken) {
    // If no token configured, return 404 (hide endpoint existence)
    return new Response(null, { status: 404 });
  }
  
  const authHeader = req.headers.get("authorization");
  const providedToken = authHeader?.replace("Bearer ", "").trim();
  
  if (providedToken !== seedToken) {
    return new Response(null, { status: 404 });
  }

  try {
    // Create or find demo client (email is not unique in schema)
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

    // Create demo project
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

    // Create demo gallery
    const gallery = await prisma.gallery.upsert({
      where: { slug: "demo-gallery" },
      update: {},
      create: {
        title: "Demo Gallery",
        slug: "demo-gallery",
        description: "Sample gallery for testing client access.",
        clientNotes: "Thank you for reviewing! Please mark your favorites and we'll prepare the final selects.",
        clientId: client.id,
        projectId: project.id,
        published: true,
      },
    });

    // Create demo images (using placeholder URLs)
    const imageUrls = [
      "/work/hotel-01/cover.svg",
      "/work/hotel-01/detail-01.svg",
      "/work/hotel-01/detail-02.svg",
    ];

    for (let i = 0; i < imageUrls.length; i++) {
      await prisma.galleryImage.upsert({
        where: {
          id: `demo-image-${i}`,
        },
        update: {
          url: imageUrls[i],
          sortOrder: i,
        },
        create: {
          id: `demo-image-${i}`,
          galleryId: gallery.id,
          url: imageUrls[i],
          alt: `Demo image ${i + 1}`,
          filename: `demo-image-${i + 1}.jpg`,
          sortOrder: i,
        },
      });
    }

    // Create access code (expires in 30 days)
    const accessCode = `DEMO-${Date.now().toString(36).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const accessToken = await prisma.galleryAccessToken.create({
      data: {
        galleryId: gallery.id,
        token: accessCode,
        label: "Demo Access",
        expiresAt,
        allowDownload: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Demo data created successfully",
      data: {
        clientId: client.id,
        clientName: client.name,
        projectId: project.id,
        projectTitle: project.title,
        galleryId: gallery.id,
        galleryTitle: gallery.title,
        accessCode: accessToken.token,
        accessUrl: `/client/${accessToken.token}`,
        expiresAt: accessToken.expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to seed demo data." },
      { status: 500 }
    );
  }
}
