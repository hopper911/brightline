/**
 * Mirotech R2 reorg — dry-run manifest or execute batched moves via Brightline admin API.
 *
 * Usage:
 *   node --env-file=.env.local tools/mirotech-r2-reorg.mjs --dry-run
 *   node --env-file=.env.local tools/mirotech-r2-reorg.mjs --execute
 *   node --env-file=.env.local tools/mirotech-r2-reorg.mjs --execute --batch=50
 *
 * Requires BRIGHTLINE_ADMIN_COOKIE (admin session cookie value) or run against local dev
 * with a valid admin session copied from browser devtools.
 */

const BATCH_DEFAULT = 200;

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const execute = argv.includes("--execute");
  const batchArg = argv.find((a) => a.startsWith("--batch="));
  const batch = batchArg ? Number(batchArg.split("=")[1]) : BATCH_DEFAULT;
  return { dryRun, execute, batch: Number.isFinite(batch) ? batch : BATCH_DEFAULT };
}

async function adminFetch(path, { method = "GET", body } = {}) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.BRIGHTLINE_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://brightlinephotography.com";
  const cookie = process.env.BRIGHTLINE_ADMIN_COOKIE?.trim();
  if (!cookie) {
    console.error("Set BRIGHTLINE_ADMIN_COOKIE to your admin session cookie value.");
    process.exit(1);
  }
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Cookie: cookie.includes("=") ? cookie : `admin_access=${cookie}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function fetchManifest() {
  const data = await adminFetch("/api/admin/r2/tools", {
    method: "POST",
    body: { op: "mirotech-reorg-manifest" },
  });
  return {
    moves: data.moves ?? [],
    blocked: data.blocked ?? [],
  };
}

async function executeBatch(moves, vault) {
  const data = await adminFetch("/api/admin/r2/move", {
    method: "POST",
    body: {
      vault,
      items: moves.map((m) => ({ from: m.from, to: m.to })),
    },
  });
  return data;
}

async function verify() {
  const data = await adminFetch("/api/admin/r2/tools", {
    method: "POST",
    body: { op: "mirotech-media-audit", maxKeys: 8000, limit: 1 },
  });
  return {
    proposedMoveCount: data.proposedMoveCount ?? 0,
    orphanCount: data.orphanCount ?? 0,
    truncated: data.truncated ?? false,
  };
}

async function main() {
  const { dryRun, execute, batch } = parseArgs(process.argv.slice(2));
  if (!dryRun && !execute) {
    console.error("Pass --dry-run or --execute");
    process.exit(1);
  }

  const { moves, blocked } = await fetchManifest();
  console.log(`Manifest: ${moves.length} moves, ${blocked.length} blocked`);

  if (blocked.length) {
    console.log("\nBlocked (Brightline DB refs — will not auto-move):");
    for (const b of blocked.slice(0, 20)) {
      console.log(`  ${b.key} — ${b.reason}`);
    }
    if (blocked.length > 20) console.log(`  … +${blocked.length - 20} more`);
  }

  if (dryRun) {
    console.log("\nProposed moves (first 30):");
    for (const m of moves.slice(0, 30)) {
      console.log(`  ${m.from} → ${m.to} (${m.reason})`);
    }
    if (moves.length > 30) console.log(`  … +${moves.length - 30} more`);
    return;
  }

  if (!moves.length) {
    console.log("Nothing to execute.");
    return;
  }

  const typed = process.argv.includes("--yes")
    ? "EXECUTE"
    : await new Promise((resolve) => {
        process.stdout.write(`Type EXECUTE to move ${moves.length} keys: `);
        process.stdin.once("data", (d) => resolve(String(d).trim()));
      });

  if (typed !== "EXECUTE") {
    console.log("Aborted.");
    process.exit(1);
  }

  const byVault = new Map();
  for (const m of moves) {
    const list = byVault.get(m.vault) ?? [];
    list.push(m);
    byVault.set(m.vault, list);
  }

  let totalMoved = 0;
  let totalFailed = 0;

  for (const [vault, vaultMoves] of byVault) {
    for (let i = 0; i < vaultMoves.length; i += batch) {
      const slice = vaultMoves.slice(i, i + batch);
      console.log(`Batch ${vault} ${i + 1}-${i + slice.length} / ${vaultMoves.length}`);
      const result = await executeBatch(slice, vault);
      totalMoved += result.moved ?? 0;
      totalFailed += result.failed ?? 0;
    }
  }

  console.log(`Done: ${totalMoved} moved, ${totalFailed} failed`);
  const check = await verify();
  console.log(
    `Post-check: ${check.proposedMoveCount} reorg candidates, ${check.orphanCount} orphans${check.truncated ? " (truncated scan)" : ""}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
