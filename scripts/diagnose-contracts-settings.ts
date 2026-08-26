/**
 * Verify starter document templates seeded via /admin/contracts/settings match
 * `STARTER_DOCUMENT_TEMPLATES` (nine fixed titles).
 *
 * Usage (from brightline/):
 *   npx tsx scripts/diagnose-contracts-settings.ts
 *
 * Exits 1 if any expected starter title is missing from DocumentTemplate.
 */
import "./load-cli-env";
import { STARTER_DOCUMENT_TEMPLATES } from "@/lib/contracts/seed-templates";
import { prisma } from "@/lib/prisma";

function dbHostHint(): string {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) return "(DATABASE_URL unset)";
  try {
    const u = new URL(raw.replace(/^postgres:/, "postgresql:"));
    return u.hostname;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  console.log("Contracts settings — starter template diagnostics");
  console.log(`Database host: ${dbHostHint()}`);
  console.log(`Expected starter count: ${STARTER_DOCUMENT_TEMPLATES.length}`);
  console.log("");

  const lines: string[] = [];
  let missing = 0;

  for (const t of STARTER_DOCUMENT_TEMPLATES) {
    const row = await prisma.documentTemplate.findFirst({
      where: { title: t.title },
      select: { id: true, isActive: true, createdByLabel: true, type: true },
    });
    if (row) {
      const matchType = row.type === t.type ? "type OK" : `type mismatch (db=${row.type} expected=${t.type})`;
      lines.push(
        `  OK  "${t.title}"\n      id=${row.id} active=${row.isActive} createdBy=${row.createdByLabel ?? "null"} ${matchType}`
      );
    } else {
      missing += 1;
      lines.push(`  MISSING  "${t.title}"`);
    }
  }

  console.log(lines.join("\n\n"));
  console.log("");

  const seedLabeled = await prisma.documentTemplate.count({
    where: { createdByLabel: "seed" },
  });
  console.log(`DocumentTemplate rows with createdByLabel="seed": ${seedLabeled}`);

  const starterTitles = new Set(STARTER_DOCUMENT_TEMPLATES.map((x) => x.title));
  const anyTitleCount = await prisma.documentTemplate.count({
    where: { title: { in: [...starterTitles] } },
  });
  console.log(`Rows matching any starter title: ${anyTitleCount} / ${STARTER_DOCUMENT_TEMPLATES.length}`);

  if (missing > 0) {
    console.error(`\nFAIL: ${missing} starter template(s) missing. Run "Seed starter templates" on /admin/contracts/settings (or POST /api/admin/contracts/seed as admin).`);
    process.exit(1);
  }

  console.log("\nPASS: all starter titles exist.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
