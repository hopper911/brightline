/**
 * Force re-sync Brightline posts that already exist on Mirotech (bl: tags),
 * or any with publishToMirotech / mirotechJournalId.
 * Usage: npx tsx scripts/resync-mirotech-journal.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

function loadEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2]!;
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]!] = v;
  }
  return out;
}

function applyEnv(vars: Record<string, string>, { overwrite = false } = {}) {
  for (const [k, v] of Object.entries(vars)) {
    if (overwrite || !process.env[k]) process.env[k] = v;
  }
}

const root = path.resolve(__dirname, "..");
const miroRoot = "/Users/kiril/Projects/mirotech-solutions";
// Prefer production Brightline DB (local .env.local may point at a branch without journal posts).
applyEnv(loadEnvFile(path.join(root, ".env.production.pull")), { overwrite: true });
applyEnv(loadEnvFile(path.join(root, ".env.production.local")), { overwrite: false });
applyEnv(loadEnvFile(path.join(root, ".env.local")), { overwrite: false });
applyEnv(loadEnvFile(path.join(root, ".env")), { overwrite: false });
console.log(
  "Brightline DB host:",
  (() => {
    try {
      return new URL(process.env.DATABASE_URL || "").host;
    } catch {
      return "(none)";
    }
  })()
);

async function loadMirotechBlLinks(): Promise<Map<string, { journalId: string; slug: string }>> {
  const map = new Map<string, { journalId: string; slug: string }>();
  const miroEnv = loadEnvFile(path.join(miroRoot, ".env.local"));
  const databaseUrl = miroEnv.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("Mirotech DATABASE_URL missing");
    return map;
  }
  const require = createRequire(path.join(miroRoot, "package.json"));
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: new (args?: {
      datasources?: { db?: { url?: string } };
    }) => {
      journalPost: {
        findMany: (args: {
          select: { id: true; slug: true; tags: true };
        }) => Promise<Array<{ id: string; slug: string; tags: string[] }>>;
      };
      $disconnect: () => Promise<void>;
    };
  };
  const miro = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const rows = await miro.journalPost.findMany({
      select: { id: true, slug: true, tags: true },
    });
    for (const row of rows) {
      map.set(`slug:${row.slug}`, { journalId: row.id, slug: row.slug });
      for (const tag of row.tags || []) {
        if (String(tag).startsWith("bl:")) {
          map.set(String(tag).slice(3), { journalId: row.id, slug: row.slug });
        }
      }
    }
  } finally {
    await miro.$disconnect();
  }
  return map;
}

async function main() {
  const { getBlogPosts, saveBlogPosts } = await import("../lib/blog-posts");
  const { syncBlogPostToMirotech } = await import("../lib/dual-brand/sync-journal");
  const posts = await getBlogPosts();
  const map = await loadMirotechBlLinks();

  console.log(
    `Brightline posts: ${posts.length}; Mirotech bl: links: ${map.size}`
  );

  const next = posts.map((p) => ({ ...p }));
  let synced = 0;
  for (let i = 0; i < next.length; i++) {
    const post = next[i]!;
    const link = map.get(post.id) || map.get(`slug:${post.slug}`);
    if (!post.publishToMirotech && !post.mirotechJournalId && !link) {
      console.log(`skip ${post.slug} id=${post.id}`);
      continue;
    }

    const toSync = {
      ...post,
      publishToMirotech: true,
      status:
        post.status === "PUBLISHED" ? ("PUBLISHED" as const) : ("PUBLISHED" as const),
      mirotechJournalId: post.mirotechJournalId || link?.journalId || "",
    };
    console.log(
      `Syncing ${toSync.slug} (bl:${post.id}) review=${Boolean(
        toSync.googleReview?.enabled
      )} mapStops=${toSync.travel?.mapStops?.length || 0} videos=${
        (toSync.videos || []).length
      }`
    );
    const result = await syncBlogPostToMirotech(toSync);
    console.log(
      result.ok ? `  OK → ${result.mirotechJournalId}` : `  FAIL: ${result.error}`
    );
    if (result.ok) {
      synced += 1;
      next[i] = {
        ...post,
        publishToMirotech: true,
        mirotechJournalId: result.mirotechJournalId || toSync.mirotechJournalId,
      };
    }
  }

  if (synced > 0) {
    await saveBlogPosts(next);
    console.log(`Saved Brightline blog_posts (${synced} synced).`);
  } else {
    console.log("No posts synced.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
