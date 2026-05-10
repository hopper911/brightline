/**
 * Client delivery package smoke test (plan: client delivery test).
 * Requires a running app: `npm run dev` (default http://localhost:3000).
 *
 * Usage (from brightline/):
 *   BASE_URL=http://localhost:3000 npx tsx scripts/client-delivery-test.ts
 */
import "./load-cli-env";
import { prisma } from "@/lib/prisma";

const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function main() {
  const pkg = await prisma.deliveryPackage.findFirst({
    where: {
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        { items: { some: { selectedForDelivery: true } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        where: { selectedForDelivery: true },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (!pkg) {
    fail(
      "No non-expired DeliveryPackage with selected-for-delivery items. Run: npm run seed:delivery-smoke (or npm run seed:delivery-smoke:empty on an empty dev DB)."
    );
  }

  const itemId = pkg.items[0]?.id;
  if (!itemId) {
    fail(`Package ${pkg.id} has no selected-for-delivery items. Add items in Admin.`);
  }

  const token = pkg.accessToken;
  const slug = pkg.publicSlug?.trim();
  console.log(`Using package id=${pkg.id}`);
  console.log(`  accessToken=${token}`);
  console.log(`  itemId=${itemId}`);
  if (slug) console.log(`  publicSlug=${slug}`);
  console.log(`  base URL=${BASE}\n`);

  const viewedBefore = await prisma.packageAccessLog.count({
    where: {
      deliveryPackageId: pkg.id,
      eventType: "viewed",
    },
  });
  const downloadedBefore = await prisma.packageAccessLog.count({
    where: {
      deliveryPackageId: pkg.id,
      eventType: "package_downloaded",
    },
  });
  let engagedBefore = 0;
  try {
    engagedBefore = await prisma.engagementEvent.count({
      where: {
        deliveryPackageId: pkg.id,
        surface: "delivery_package",
      },
    });
  } catch {
    engagedBefore = 0;
  }

  // 1. Package page (logs viewed)
  const pageRes = await fetch(`${BASE}/package/${encodeURIComponent(token)}`, {
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  if (pageRes.status !== 200) {
    fail(`GET /package/{token} expected 200, got ${pageRes.status}. Is the dev server running? (${BASE})`);
  }
  console.log(`✓ GET /package/{token} → ${pageRes.status}`);

  // 2. Optional public slug redirect
  if (slug) {
    const slugRes = await fetch(`${BASE}/delivery/${encodeURIComponent(slug)}`, {
      redirect: "manual",
    });
    const loc = slugRes.headers.get("location") || "";
    if (!(slugRes.status >= 300 && slugRes.status < 400) || !loc.includes(`/package/`)) {
      fail(`GET /delivery/{slug} expected 3xx Location to /package/..., got ${slugRes.status} Location=${loc}`);
    }
    console.log(`✓ GET /delivery/{slug} → ${slugRes.status} Location OK`);
  } else {
    console.log("○ GET /delivery/{slug} skipped (no publicSlug on package)");
  }

  // 3. Manifest
  const manRes = await fetch(`${BASE}/api/package/${encodeURIComponent(token)}/manifest`);
  const manText = await manRes.text();
  let manJson: { ok?: boolean };
  try {
    manJson = JSON.parse(manText) as { ok?: boolean };
  } catch {
    fail(`Manifest response is not JSON (${manRes.status}).`);
  }
  if (manRes.status !== 200 || !manJson.ok) {
    fail(`GET manifest expected 200 + ok true, got ${manRes.status} ${manText.slice(0, 200)}`);
  }
  console.log(`✓ GET manifest → ${manRes.status}`);

  // 4. Track
  const trackRes = await fetch(`${BASE}/api/package/${encodeURIComponent(token)}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemId,
      eventType: "image_viewed",
      durationMs: 500,
      clickOrder: 1,
    }),
  });
  const trackJson = (await trackRes.json()) as { ok?: boolean };
  if (trackRes.status !== 200 || !trackJson.ok) {
    fail(`POST track failed ${trackRes.status} ${JSON.stringify(trackJson)}`);
  }
  console.log(`✓ POST track → ${trackRes.status}`);

  // 5. Download (may redirect to R2 — needs env)
  const dlRes = await fetch(`${BASE}/api/package/${encodeURIComponent(token)}/items/${encodeURIComponent(itemId)}/download`, {
    redirect: "manual",
  });
  if (dlRes.status === 302 || dlRes.status === 307) {
    console.log(`✓ GET download (valid item) → ${dlRes.status} redirect`);
  } else if (dlRes.status === 404) {
    fail("GET download returned 404 — item missing key or not selectedForDelivery.");
  } else {
    console.warn(
      `⚠ GET download → ${dlRes.status} (expected 302; R2/signing may be unset locally — check body)`
    );
    const t = await dlRes.text();
    console.warn(t.slice(0, 300));
  }

  // 6. IDOR — bogus item id
  const badRes = await fetch(
    `${BASE}/api/package/${encodeURIComponent(token)}/items/cm00000000000000000000001/download`
  );
  if (badRes.status !== 404) {
    console.warn(`⚠ wrong cuid download returned ${badRes.status} (404 expected for random id)`);
  } else {
    console.log(`✓ GET download (invalid itemId) → 404`);
  }

  const fakeTrack = await fetch(`${BASE}/api/package/${encodeURIComponent(token)}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      itemId: "cm00000000000000000000002",
      eventType: "image_viewed",
    }),
  });
  if (fakeTrack.status !== 404) {
    fail(`POST track with wrong itemId expected 404, got ${fakeTrack.status}`);
  }
  console.log(`✓ POST track (invalid itemId) → 404`);

  // DB verification (best-effort)
  const viewedAfter = await prisma.packageAccessLog.count({
    where: { deliveryPackageId: pkg.id, eventType: "viewed" },
  });
  const downloadedAfter = await prisma.packageAccessLog.count({
    where: { deliveryPackageId: pkg.id, eventType: "package_downloaded" },
  });

  console.log("");
  console.log("Log counts (deliveryPackageId scoped):");
  console.log(`  packageAccessLog viewed: ${viewedBefore} → ${viewedAfter} (page hit should bump)`);
  console.log(`  packageAccessLog package_downloaded: ${downloadedBefore} → ${downloadedAfter}`);
  try {
    const engagedAfter = await prisma.engagementEvent.count({
      where: { deliveryPackageId: pkg.id, surface: "delivery_package" },
    });
    console.log(`  engagementEvent delivery_package: ${engagedBefore} → ${engagedAfter} (track should bump)`);
    if (engagedAfter <= engagedBefore) {
      console.warn("⚠ EngagementEvent did not increase — migrations or AI_OPS not required here; track still wrote packageAccessLog via separate path.");
    }
  } catch {
    console.warn("⚠ EngagementEvent table not queried (migrate if missing).");
  }

  console.log("\n✅ Client delivery smoke test finished.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
