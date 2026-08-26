/**
 * Repair MediaAsset rows where an 800px `web_thumb` key was stored as `keyFull`
 * (heroes/grids rendered low-res). Rewrites keyFull → the sibling `web_full` key
 * when that object exists in R2, and keeps the thumb in keyThumb.
 *
 * Usage:
 *   DRY_RUN=1 npx tsx scripts/repair-media-thumb-keys.ts
 *   BRIGHTLINE_ENV=production npx tsx scripts/repair-media-thumb-keys.ts
 */
import "./load-cli-env";

const MEDIA_BASE = "https://brightlinephotography.com/api/media/public";

/** Existence check via the live media endpoint — same bucket production serves from, no R2 creds needed. */
async function objectExists(key: string, attempts = 3): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${MEDIA_BASE}?key=${encodeURIComponent(key)}`, {
        redirect: "manual",
      });
      if (res.status === 302) {
        const signedUrl = res.headers.get("location");
        if (signedUrl) {
          const upstream = await fetch(signedUrl, {
            headers: { Range: "bytes=0-0" },
          });
          if (upstream.ok) return true;
          if (upstream.status === 404) return false;
        }
      }
    } catch {
      // transient network error — retry
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  return false;
}

async function main() {
  const { prisma } = await import("@/lib/prisma");

  const dryRun = process.env.DRY_RUN === "1";

  const broken = await prisma.mediaAsset.findMany({
    where: { keyFull: { contains: "/web_thumb/" } },
    select: { id: true, keyFull: true, keyThumb: true },
  });

  console.log(`Found ${broken.length} media assets with web_thumb stored as keyFull.`);

  const { extractPublicMediaKey } = await import("@/lib/r2");

  let fixed = 0;
  let skipped = 0;
  for (const asset of broken) {
    // Some legacy rows store a full https URL instead of a bare key — normalize first.
    const thumbKey = extractPublicMediaKey(asset.keyFull!) ?? asset.keyFull!;
    const fullKey = thumbKey.replace("/web_thumb/", "/web_full/");

    if (!(await objectExists(fullKey))) {
      console.log(`  SKIP ${asset.id}: no web_full sibling for ${thumbKey}`);
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`  DRY  ${asset.id}: ${thumbKey} -> ${fullKey}`);
    } else {
      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { keyFull: fullKey, keyThumb: thumbKey },
      });
      console.log(`  FIX  ${asset.id}: ${thumbKey} -> ${fullKey}`);
    }
    fixed += 1;
  }

  console.log(`${dryRun ? "Would fix" : "Fixed"} ${fixed}, skipped ${skipped}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
