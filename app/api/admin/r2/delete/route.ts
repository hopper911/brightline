import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import { prisma } from "@/lib/prisma";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  findR2KeyUsage,
  invalidateReferencedR2KeyCache,
} from "@/lib/admin-r2-manager";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { deleteObjects } from "@/lib/storage-r2";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  if (await isRateLimitedAsync(getClientIp(req), { scope: "r2-delete", max: 60, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ ok: false, error: "Too many delete requests." }, { status: 429 });
  }

  let body: {
    keys?: string[];
    force?: boolean;
    confirm?: string;
    vault?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);

  const keys = [...new Set((body.keys ?? []).map(cleanR2Key).filter(Boolean))];
  if (!keys.length) {
    return NextResponse.json({ ok: false, error: "keys required." }, { status: 400 });
  }
  if (keys.length > 200) {
    return NextResponse.json({ ok: false, error: "Max 200 deletes per request." }, { status: 400 });
  }
  if (keys.length > 1 && body.confirm !== "DELETE") {
    return NextResponse.json(
      { ok: false, error: 'Bulk delete requires confirm: "DELETE".' },
      { status: 400 }
    );
  }

  try {
    for (const key of keys) assertR2ManagerKeyAllowed(key, vault);

    // Brightline DB usage checks only apply to the Brightline vault.
    if (vault === "brightline") {
      const usages = await Promise.all(keys.map((k) => findR2KeyUsage(k)));
      const referenced = usages.filter((u) => u.totalRefs > 0);

      if (referenced.length && !body.force) {
        return NextResponse.json(
          {
            ok: false,
            error: "Some keys are still referenced in the database. Pass force: true to delete anyway.",
            referenced: referenced.map((u) => ({
              key: u.key,
              totalRefs: u.totalRefs,
              mediaAssetCount: u.mediaAssets.length,
              galleryImageCount: u.galleryImages.length,
              galleryVideoCount: u.galleryVideos.length,
              deliveryItemCount: u.deliveryItems.length,
            })),
          },
          { status: 409 }
        );
      }

      if (body.force && referenced.length) {
        await prisma.$transaction(
          keys.flatMap((key) => [
            prisma.mediaAsset.updateMany({ where: { keyFull: key }, data: { keyFull: null } }),
            prisma.mediaAsset.updateMany({ where: { keyThumb: key }, data: { keyThumb: null } }),
            prisma.mediaAsset.updateMany({ where: { posterKey: key }, data: { posterKey: null } }),
            prisma.galleryImage.updateMany({ where: { storageKey: key }, data: { storageKey: null } }),
            prisma.galleryImage.updateMany({
              where: { lowResStorageKey: key },
              data: { lowResStorageKey: null },
            }),
            prisma.galleryVideo.updateMany({ where: { storageKey: key }, data: { storageKey: null } }),
            prisma.galleryVideo.updateMany({ where: { posterKey: key }, data: { posterKey: null } }),
            prisma.deliveryPackageItem.updateMany({
              where: { storageKey: key },
              data: { storageKey: null },
            }),
            prisma.portfolioProject.updateMany({
              where: { coverStorageKey: key },
              data: { coverStorageKey: null },
            }),
            prisma.portfolioImage.updateMany({ where: { storageKey: key }, data: { storageKey: null } }),
            prisma.siteBackgroundVideo.updateMany({
              where: { webStorageKey: key },
              data: { webStorageKey: null },
            }),
            prisma.siteBackgroundVideo.updateMany({
              where: { posterKey: key },
              data: { posterKey: null },
            }),
            prisma.designProject.updateMany({ where: { ogImageKey: key }, data: { ogImageKey: null } }),
            prisma.studioInvoice.updateMany({
              where: { pdfStorageKey: key },
              data: { pdfStorageKey: null },
            }),
            prisma.studioExpense.updateMany({ where: { receiptKey: key }, data: { receiptKey: null } }),
            prisma.generatedDocument.updateMany({
              where: { draftPdfKey: key },
              data: { draftPdfKey: null },
            }),
            prisma.generatedDocument.updateMany({
              where: { signedPdfKey: key },
              data: { signedPdfKey: null },
            }),
          ])
        );
      }

      const result = await deleteObjects(keys, vault);
      invalidateReferencedR2KeyCache();
      return NextResponse.json({
        ok: result.errors.length === 0,
        deleted: result.deleted,
        errors: result.errors,
        forced: Boolean(body.force),
        previouslyReferenced: referenced.length,
        vault,
      });
    }

    const result = await deleteObjects(keys, vault);
    return NextResponse.json({
      ok: result.errors.length === 0,
      deleted: result.deleted,
      errors: result.errors,
      forced: false,
      previouslyReferenced: 0,
      vault,
    });
  } catch (err) {
    console.error("R2_MANAGER_DELETE_ERROR", err);
    const message = err instanceof Error ? err.message : "Delete failed.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
