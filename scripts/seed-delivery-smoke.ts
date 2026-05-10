/**
 * Creates one DeliveryPackage + items for local smoke testing when the DB is empty.
 *
 * Requires: at least one WorkProject with IMAGE media attached (CMS project media),
 * unless `DELIVERY_SMOKE_BOOTSTRAP_EMPTY=1` (creates a tiny synthetic project + IMAGE).
 *
 * Usage (from brightline/):
 *   npx tsx scripts/seed-delivery-smoke.ts
 *
 * Optional:
 *   WORK_PROJECT_ID=cuid npx tsx scripts/seed-delivery-smoke.ts
 *   DELIVERY_SMOKE_BOOTSTRAP_EMPTY=1 npx tsx scripts/seed-delivery-smoke.ts
 */
import "./load-cli-env";
import { randomBytes } from "crypto";
import { createDefaultPackageItems, createPackageAccessToken } from "@/lib/delivery/db";
import { prisma } from "@/lib/prisma";

async function main() {
  const explicitId = process.env.WORK_PROJECT_ID?.trim();
  let project = explicitId
    ? await prisma.workProject.findUnique({
        where: { id: explicitId },
        select: { id: true, title: true },
      })
    : await prisma.workProject.findFirst({
        where: {
          media: {
            some: {
              media: { kind: "IMAGE" },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true },
      });

  if (!project && process.env.DELIVERY_SMOKE_BOOTSTRAP_EMPTY === "1") {
    const slug = `smoke-${randomBytes(5).toString("base64url").replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
    const media = await prisma.mediaAsset.create({
      data: {
        kind: "IMAGE",
        alt: "[smoke] Synthetic placeholder asset",
        keyFull: "__smoke__/delivery-placeholder/full.jpg",
        keyThumb: "__smoke__/delivery-placeholder/thumb.jpg",
      },
    });
    const createdWp = await prisma.workProject.create({
      data: {
        section: "ACD",
        title: "[smoke] Synthetic project — client delivery bootstrap",
        slug,
        published: false,
        media: {
          create: {
            mediaId: media.id,
            sortOrder: 0,
            deliveryGroup: "archive",
            selectedForDelivery: true,
          },
        },
      },
      select: { id: true, title: true },
    });
    project = createdWp;
    console.log("Bootstrapped synthetic WorkProject + IMAGE (DELIVERY_SMOKE_BOOTSTRAP_EMPTY=1).");
  }

  if (!project) {
    console.error(
      "No suitable WorkProject found.\n" +
        "  Attach at least one IMAGE to a project in Admin → Work / project edit (Project media),\n" +
        "  then re-run. Set WORK_PROJECT_ID to a project that has images, or use\n" +
        "  DELIVERY_SMOKE_BOOTSTRAP_EMPTY=1 for an empty dev database (synthetic row)."
    );
    process.exit(1);
  }

  const hasMedia = await prisma.projectMedia.findFirst({
    where: { projectId: project.id, media: { kind: "IMAGE" } },
    select: { mediaId: true },
  });
  if (!hasMedia) {
    console.error(`Work project "${project.title}" (${project.id}) has no IMAGE media. Add images in the CMS first.`);
    process.exit(1);
  }

  const title = `[smoke] Delivery test — ${project.title}`.slice(0, 120);
  const publicSlug = `smoke-${randomBytes(6).toString("base64url")}`;

  const pkg = await prisma.deliveryPackage.create({
    data: {
      projectId: project.id,
      title,
      accessToken: createPackageAccessToken(),
      publicSlug,
      status: "draft",
      notes: "Created by scripts/seed-delivery-smoke.ts for local client delivery testing.",
    },
  });

  await createDefaultPackageItems(pkg.id, project.id);
  await prisma.deliveryPackageItem.updateMany({
    where: { deliveryPackageId: pkg.id, storageKey: { not: null } },
    data: { selectedForDelivery: true },
  });

  const full = await prisma.deliveryPackage.findUnique({
    where: { id: pkg.id },
    include: { _count: { select: { items: true } } },
  });

  const base = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  console.log("");
  console.log("Created delivery package:");
  console.log(`  id:           ${pkg.id}`);
  console.log(`  accessToken:  ${pkg.accessToken}`);
  console.log(`  publicSlug:   ${publicSlug}`);
  console.log(`  item count:   ${full?._count.items ?? "?"}`);
  console.log("");
  console.log("Open in browser:");
  console.log(`  ${base}/package/${pkg.accessToken}`);
  console.log(`  ${base}/delivery/${publicSlug}`);
  console.log(`  ${base}/api/package/${pkg.accessToken}/manifest`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
