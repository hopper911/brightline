/**
 * Execute Mirotech R2 reorg against production admin API (minted session).
 *
 *   npx tsx --env-file=.env.local scripts/execute-prod-mirotech-reorg.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/execute-prod-mirotech-reorg.ts --execute --yes
 */

import { createAdminSessionToken } from "@/lib/admin-session";

const BASE = "https://brightlinephotography.com";
const BATCH = 30;

function parseArgs() {
  return {
    dryRun: process.argv.includes("--dry-run"),
    execute: process.argv.includes("--execute"),
    yes: process.argv.includes("--yes"),
  };
}

async function api(path: string, body?: unknown) {
  const t = createAdminSessionToken();
  if (!t) throw new Error("Could not mint admin session (ADMIN_SESSION_SECRET)");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Cookie: `admin_access=${t}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(String(data.error ?? `HTTP ${res.status}`));
  }
  return data;
}

async function main() {
  const { dryRun, execute, yes } = parseArgs();
  if (!dryRun && !execute) {
    console.error("Pass --dry-run or --execute");
    process.exit(1);
  }

  const manifest = await api("/api/admin/r2/tools", { op: "mirotech-reorg-manifest" });
  const moves =
    (manifest.moves as Array<{
      from: string;
      to: string;
      vault: string;
      reason: string;
    }>) ?? [];
  const blocked = (manifest.blocked as Array<{ key: string; reason: string }>) ?? [];

  console.log(`Manifest: ${moves.length} moves, ${blocked.length} blocked`);

  if (dryRun) {
    for (const m of moves.slice(0, 50)) console.log(`  ${m.from} → ${m.to}`);
    if (moves.length > 50) console.log(`  … +${moves.length - 50} more`);
    return;
  }

  if (!moves.length) {
    console.log("Nothing to execute.");
    return;
  }

  if (!yes) {
    console.error("Pass --yes to confirm.");
    process.exit(1);
  }

  const caseStudyMoves = moves.filter((m) => m.reason.includes("case-study"));
  let moved = 0;
  let failed = 0;

  for (let i = 0; i < moves.length; i += BATCH) {
    const slice = moves.slice(i, i + BATCH);
    const vault = slice[0]?.vault ?? "brightline";
    console.log(`R2 batch ${i + 1}-${i + slice.length} / ${moves.length}`);
    try {
      const result = await api("/api/admin/r2/move", {
        vault,
        skipCmsRewrite: true,
        items: slice.map((m) => ({ from: m.from, to: m.to })),
      });
      moved += Number(result.moved ?? 0);
      failed += Number(result.failed ?? 0);
    } catch (err) {
      console.error(`  Batch failed: ${err instanceof Error ? err.message : err}`);
      failed += slice.length;
    }
  }

  console.log(`R2 done: ${moved} moved, ${failed} failed`);

  if (caseStudyMoves.length) {
    console.log(`CMS batch rewrite for ${caseStudyMoves.length} case-study keys…`);
    const cms = await api("/api/admin/r2/tools", {
      op: "mirotech-cms-rewrite-batch",
      pairs: caseStudyMoves.map((m) => ({ from: m.from, to: m.to })),
    });
    console.log(
      `CMS: ${cms.cmsUpdates} refs, ${cms.projectsUpdated} projects, ${cms.blogsUpdated} blogs`
    );
  }

  const check = await api("/api/admin/r2/tools", {
    op: "mirotech-media-audit",
    maxKeys: 8000,
    limit: 1,
  });
  console.log(
    `Post-check: ${check.proposedMoveCount} reorg candidates, ${check.orphanCount} orphans`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
