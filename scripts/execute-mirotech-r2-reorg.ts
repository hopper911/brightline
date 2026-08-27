/**
 * Execute Mirotech R2 reorg server-side (R2 + CMS + Prisma rewrites).
 * Uses production DB from .env.production.local; R2 creds from .env.local without overriding DB URL.
 *
 *   npx tsx scripts/execute-mirotech-r2-reorg.ts --dry-run
 *   npx tsx scripts/execute-mirotech-r2-reorg.ts --execute --yes
 */

import { config } from "dotenv";

config({ path: ".env.production.local" });
const prodDatabaseUrl = process.env.DATABASE_URL;
const prodDirectUrl = process.env.DIRECT_URL;
config({ path: ".env.local", override: true });
if (prodDatabaseUrl) process.env.DATABASE_URL = prodDatabaseUrl;
if (prodDirectUrl) process.env.DIRECT_URL = prodDirectUrl;

import {
  buildMirotechReorgManifest,
  buildMirotechMediaAudit,
} from "@/lib/admin-r2-mirotech-audit";
import { rewriteMirotechCmsKeyReferences } from "@/lib/admin-r2-mirotech-cms-rewrite";
import {
  invalidateReferencedR2KeyCache,
  rewriteR2KeyReferences,
} from "@/lib/admin-r2-manager";
import type { R2VaultId } from "@/lib/r2-vaults-shared";
import { moveObject } from "@/lib/storage-r2";

const BATCH = 50;

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const execute = process.argv.includes("--execute");
  const yes = process.argv.includes("--yes");
  return { dryRun, execute, yes };
}

async function executeMoves(
  moves: Array<{ from: string; to: string; vault: R2VaultId; reason: string }>
) {
  let moved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < moves.length; i += BATCH) {
    const slice = moves.slice(i, i + BATCH);
    console.log(`Batch ${i + 1}-${i + slice.length} / ${moves.length}`);
    for (const m of slice) {
      try {
        await moveObject(m.from, m.to, m.vault);
        const dbUpdates =
          m.vault === "brightline" ? await rewriteR2KeyReferences(m.from, m.to) : 0;
        let cmsUpdates = 0;
        if (m.reason.includes("case-study")) {
          const cms = await rewriteMirotechCmsKeyReferences(m.from, m.to);
          cmsUpdates = cms.cmsUpdates;
        }
        console.log(`  OK ${m.from} → ${m.to} (db:${dbUpdates} cms:${cmsUpdates})`);
        moved += 1;
      } catch (err) {
        failed += 1;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${m.from}: ${msg}`);
        console.error(`  FAIL ${m.from}: ${msg}`);
      }
    }
  }

  if (failed === 0) invalidateReferencedR2KeyCache();
  return { moved, failed, errors };
}

async function main() {
  const { dryRun, execute, yes } = parseArgs();
  if (!dryRun && !execute) {
    console.error("Pass --dry-run or --execute");
    process.exit(1);
  }

  const { moves, blocked } = await buildMirotechReorgManifest();
  console.log(`Manifest: ${moves.length} moves, ${blocked.length} blocked`);

  if (blocked.length) {
    console.log("\nBlocked (Brightline DB refs):");
    for (const b of blocked.slice(0, 15)) {
      console.log(`  ${b.key}`);
    }
    if (blocked.length > 15) console.log(`  … +${blocked.length - 15} more`);
  }

  if (dryRun) {
    console.log("\nProposed moves (first 40):");
    for (const m of moves.slice(0, 40)) {
      console.log(`  ${m.from} → ${m.to}`);
    }
    if (moves.length > 40) console.log(`  … +${moves.length - 40} more`);
    return;
  }

  if (!moves.length) {
    console.log("Nothing to execute.");
    return;
  }

  if (!yes) {
    console.error("Pass --yes to confirm execution.");
    process.exit(1);
  }

  console.log(`Executing ${moves.length} moves…`);
  const result = await executeMoves(moves);
  console.log(`Done: ${result.moved} moved, ${result.failed} failed`);

  const audit = await buildMirotechMediaAudit({ maxKeys: 8000, kind: "all" });
  console.log(
    `Post-check: ${audit.proposedMoveCount} reorg candidates, ${audit.orphanCount} orphans, truncated=${audit.truncated}`
  );

  if (result.errors.length) {
    console.log("\nErrors:");
    result.errors.slice(0, 20).forEach((e) => console.log(`  ${e}`));
    process.exit(result.failed > 0 ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
