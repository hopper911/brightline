/* eslint-disable @typescript-eslint/no-require-imports -- Prisma seed is CommonJS */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PILLARS = [
  { slug: "arc", label: "Architecture & Real Estate", section: "REA" },
  { slug: "cam", label: "Campaign & Advertising", section: "ACD" },
  { slug: "cor", label: "Corporate & Executive", section: "BIZ" },
];

async function main() {
  await prisma.contactMessage.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "Avery Collins",
        email: "avery@example.com",
        message: "Interested in a commercial shoot for our new mixed-use tower.",
      },
      {
        name: "Jordan Lee",
        email: "jordan@example.com",
        message: "We need architecture imagery for a boutique hotel opening in May.",
      },
    ],
  });

  for (const { section, label } of PILLARS) {
    const existing = await prisma.workProject.findFirst({
      where: { section, slug: "showcase" },
    });
    if (existing) continue;

    await prisma.workProject.create({
      data: {
        section,
        title: label,
        slug: "showcase",
        summary: `Add your ${label} imagery. Upload from R2 via Admin.`,
        year: new Date().getFullYear(),
        published: true,
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
