/* eslint-disable @typescript-eslint/no-require-imports -- Prisma seed is CommonJS */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEMO_CLIENT_EMAIL = "morgan@demo-client.co";
const DEMO_PROJECT_SLUG = "demo-studio-os-project";
const DEMO_GALLERY_ACCESS = "DEMO1234";
const SEED_WORKFLOW = "seed-studio-os-phase1";

async function main() {
  const demoEmails = ["avery@example.com", "jordan@example.com"];
  const existingDemoMsgs = await prisma.contactMessage.count({
    where: { email: { in: demoEmails } },
  });
  if (existingDemoMsgs === 0) {
    await prisma.contactMessage.createMany({
      data: [
        {
          name: "Avery Collins",
          email: demoEmails[0],
          message:
            "Interested in a commercial shoot for our new mixed-use tower.",
        },
        {
          name: "Jordan Lee",
          email: demoEmails[1],
          message:
            "We need architecture imagery for a boutique hotel opening in May.",
        },
      ],
    });
  }

  let studioClient =
    (await prisma.studioClient.findFirst({
      where: { email: DEMO_CLIENT_EMAIL },
    })) ??
    (await prisma.studioClient.create({
      data: {
        companyName: "Demo Client Co.",
        primaryContactName: "Morgan Rivera",
        email: DEMO_CLIENT_EMAIL,
        phone: "+1 (555) 010-2000",
        website: "https://demo-client.co",
        industry: "Real Estate",
        city: "Jersey City",
        state: "NJ",
        country: "USA",
        notes: "Seeded for Studio OS Phase 1.",
        isActive: true,
      },
    }));

  const studioProject = await prisma.studioProject.upsert({
    where: { slug: DEMO_PROJECT_SLUG },
    create: {
      title: "Demo Studio OS Project",
      slug: DEMO_PROJECT_SLUG,
      clientId: studioClient.id,
      client: studioClient.companyName,
      category: "Architecture",
      subcategory: "Mixed-use",
      location: "Jersey City, NJ",
      year: new Date().getFullYear(),
      status: "INQUIRY",
      pillar: "acd",
      summary: "A seeded project used to validate Studio OS foundations.",
      notes: "Seeded for Studio OS Phase 1.",
      isPublicReady: false,
      opening: "A calm, image-led opening for a seeded Studio OS project.",
      context:
        "This record exists to validate the database, admin routes, and future workflows.",
      approach:
        "Add media, create a gallery, and evolve into a case study when ready.",
      highlight: "Built to be operational, not ornamental.",
      closing: "Ready for Phase 2 admin scaffolding.",
      featured: false,
      published: false,
      gallery: [],
    },
    update: {
      clientId: studioClient.id,
      client: studioClient.companyName,
    },
  });

  let media1 = await prisma.studioMedia.findFirst({
    where: { projectId: studioProject.id, filename: "demo-01.jpg" },
  });
  if (!media1) {
    media1 = await prisma.studioMedia.create({
      data: {
        projectId: studioProject.id,
        filename: "demo-01.jpg",
        filenameBase: "demo-01",
        r2KeyFull: "studio-os/demo/demo-01.jpg",
        urlFull: "https://example.invalid/r2/studio-os/demo/demo-01.jpg",
        width: 3000,
        height: 2000,
        orientation: "LANDSCAPE",
        visibility: "INTERNAL",
        isHeroCandidate: true,
        tagsCsv: "demo,seed,studio-os",
      },
    });
  }

  let media2 = await prisma.studioMedia.findFirst({
    where: { projectId: studioProject.id, filename: "demo-02.jpg" },
  });
  if (!media2) {
    media2 = await prisma.studioMedia.create({
      data: {
        projectId: studioProject.id,
        filename: "demo-02.jpg",
        filenameBase: "demo-02",
        r2KeyFull: "studio-os/demo/demo-02.jpg",
        urlFull: "https://example.invalid/r2/studio-os/demo/demo-02.jpg",
        width: 2000,
        height: 3000,
        orientation: "PORTRAIT",
        visibility: "INTERNAL",
        tagsCsv: "demo,seed,studio-os",
      },
    });
  }

  await prisma.studioProject.update({
    where: { id: studioProject.id },
    data: { heroStudioMediaId: media1.id },
  });

  let studioGallery = await prisma.studioGallery.findFirst({
    where: {
      projectId: studioProject.id,
      accessCode: DEMO_GALLERY_ACCESS,
    },
  });
  if (!studioGallery) {
    studioGallery = await prisma.studioGallery.create({
      data: {
        projectId: studioProject.id,
        title: "Demo Proof Gallery",
        galleryType: "PROOF",
        status: "DRAFT",
        accessCode: DEMO_GALLERY_ACCESS,
        notes: "Seeded proof gallery.",
      },
    });
  }

  await prisma.studioGalleryMedia.createMany({
    data: [
      { galleryId: studioGallery.id, mediaId: media1.id, sortOrder: 0 },
      { galleryId: studioGallery.id, mediaId: media2.id, sortOrder: 1 },
    ],
    skipDuplicates: true,
  });

  const existingRun = await prisma.automationRun.findFirst({
    where: {
      workflowName: SEED_WORKFLOW,
      entityId: studioProject.id,
    },
  });
  if (!existingRun) {
    await prisma.automationRun.create({
      data: {
        workflowName: SEED_WORKFLOW,
        status: "OK",
        triggerType: "seed",
        entityType: "StudioProject",
        entityId: studioProject.id,
        message: "Seeded minimal Studio OS records.",
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
