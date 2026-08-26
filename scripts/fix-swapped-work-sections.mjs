/**
 * One-shot repair: published WorkProjects had Advertising ↔ Commercial sections inverted
 * (campaign/fashion on REA, interiors/offices on ACD). Pillar config was already correct.
 *
 * Usage (production):
 *   node --env-file=.env.production.local scripts/fix-swapped-work-sections.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Campaign / fashion / editorial — belong on advertising (ACD). */
const TO_ADVERTISING = [
  "anne-bowen-shoot",
  "erny-nyc",
  "jewelry-photoshoot",
  "models-and-actors",
  "eshave-campaign-shoot",
];

/** Buildings / interiors / offices — belong on commercial (REA). */
const TO_COMMERCIAL = [
  "conference-room",
  "empire-state-building-office-space",
  "fintech-office-space",
  "220_hudson_st",
  "residential-photoshoot",
  "speakeasy-lounge-photoshoot",
];

async function main() {
  const dry = process.argv.includes("--dry-run");
  console.log(dry ? "DRY RUN" : "APPLYING");

  const before = await prisma.workProject.findMany({
    where: { slug: { in: [...TO_ADVERTISING, ...TO_COMMERCIAL] } },
    select: { id: true, slug: true, section: true, title: true },
    orderBy: { title: "asc" },
  });
  for (const p of before) console.log("before", p.section, p.slug);

  if (dry) return;

  await prisma.$transaction(async (tx) => {
    const park = await tx.workProject.findMany({
      where: { slug: { in: TO_COMMERCIAL }, section: "ACD" },
      select: { id: true },
    });
    for (const r of park) {
      await tx.workProject.update({ where: { id: r.id }, data: { section: "TRI" } });
    }
    const ads = await tx.workProject.findMany({
      where: { slug: { in: TO_ADVERTISING }, section: "REA" },
      select: { id: true },
    });
    for (const r of ads) {
      await tx.workProject.update({ where: { id: r.id }, data: { section: "ACD" } });
    }
    for (const r of park) {
      await tx.workProject.update({ where: { id: r.id }, data: { section: "REA" } });
    }
  });

  const after = await prisma.workProject.findMany({
    where: { slug: { in: [...TO_ADVERTISING, ...TO_COMMERCIAL] } },
    select: { slug: true, section: true, title: true },
    orderBy: { title: "asc" },
  });
  for (const p of after) console.log("after", p.section, p.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
