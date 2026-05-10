import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { packageInclude } from "@/lib/delivery/db";
import { createR2KeysZipResponse, MAX_ZIP_FILES } from "@/lib/zip/r2KeysZipResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function extensionFromKey(storageKey: string): string {
  const base = storageKey.split("/").pop() ?? "";
  const m = /\.(jpe?g|png|gif|webp|tiff?|heic|avif|mp4|mov|webm)$/i.exec(base);
  return m ? m[0].toLowerCase() : ".jpg";
}

function safeZipBaseName(title: string, pkgId: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug ? `brightline-delivery-${slug}.zip` : `brightline-delivery-${pkgId.slice(0, 8)}.zip`;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  const { accessToken } = await context.params;
  const pkg = await prisma.deliveryPackage.findUnique({
    where: { accessToken },
    include: packageInclude(),
  });

  if (!pkg || (pkg.expiresAt && pkg.expiresAt.getTime() < Date.now())) {
    return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  }

  const items = pkg.items.filter((item) => item.selectedForDelivery && item.variantKey === "");
  const entries = items
    .map((item) => {
      const key = item.storageKey ?? item.mediaAsset?.keyFull ?? null;
      if (!key) return null;
      const ext = extensionFromKey(key);
      const name = `${String(item.sortOrder).padStart(3, "0")}-${item.id.slice(-8)}${ext}`;
      return { key, name };
    })
    .filter((x): x is { key: string; name: string } => x != null);

  if (entries.length === 0) {
    return NextResponse.json({ ok: false, error: "No downloadable files in this package." }, { status: 400 });
  }

  if (entries.length > MAX_ZIP_FILES) {
    return NextResponse.json(
      {
        ok: false,
        error: `This package has too many files (${entries.length} files, max ${MAX_ZIP_FILES} per ZIP). Contact Bright Line for a split delivery.`,
      },
      { status: 400 }
    );
  }

  const h = await headers();
  await prisma.packageAccessLog
    .create({
      data: {
        deliveryPackageId: pkg.id,
        eventType: "package_zip_downloaded",
        ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent"),
      },
    })
    .catch(() => null);

  try {
    return createR2KeysZipResponse(entries, safeZipBaseName(pkg.title, pkg.id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ZIP failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
