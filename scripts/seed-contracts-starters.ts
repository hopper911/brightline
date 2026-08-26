/**
 * Idempotently insert nine starter document templates (same as POST /api/admin/contracts/seed).
 * For local/CI when you do not have an admin session. Uses load-cli-env DATABASE_URL.
 *
 * Usage (from brightline/):
 *   npx tsx scripts/seed-contracts-starters.ts
 */
import "./load-cli-env";
import { STARTER_DOCUMENT_TEMPLATES } from "@/lib/contracts/seed-templates";
import { prisma } from "@/lib/prisma";

async function main() {
  let created = 0;
  let skipped = 0;
  for (const t of STARTER_DOCUMENT_TEMPLATES) {
    const exists = await prisma.documentTemplate.findFirst({
      where: { title: t.title },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }
    await prisma.documentTemplate.create({
      data: {
        title: t.title,
        type: t.type,
        description: t.description,
        contentHtml: t.contentHtml,
        variables: t.variables,
        isActive: true,
        createdByLabel: "seed",
      },
    });
    created += 1;
  }

  await prisma.documentAuditLog.create({
    data: {
      actorType: "system",
      action: "document.templates_seeded",
      metadata: { created, skipped, source: "scripts/seed-contracts-starters.ts" },
    },
  });

  console.log(`Done. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
