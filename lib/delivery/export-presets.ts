import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { getObjectBuffer, putObjectBuffer } from "@/lib/storage-r2";
import { getPresetById, type DeliveryPresetDef } from "@/lib/delivery/presets";
import { defaultLicensedUsageTypes } from "@/lib/delivery/db";
import { normalizeDeliveryGroup } from "@/lib/delivery/package";

function deliveryR2Key(projectSlug: string, presetFolder: string, baseName: string, format: string) {
  const safeSlug = projectSlug.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\/+/, "");
  const folder = presetFolder.replace(/^\/+/, "").replace(/\/+$/, "");
  return `delivery/${safeSlug}/${folder}/${baseName}.${format}`;
}

function baseFilenameFromKey(key: string | null | undefined, fallback: string) {
  if (!key) return fallback;
  const part = key.split("/").pop() ?? fallback;
  return part.replace(/\.[^.]+$/, "") || fallback;
}

async function renderPresetBuffer(source: Buffer, preset: DeliveryPresetDef): Promise<Buffer> {
  const img = sharp(source, { failOn: "none" }).rotate();

  if (preset.kind === "long_edge" && preset.longEdge) {
    const meta = await img.metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) {
      return img.webp({ quality: 86 }).toBuffer();
    }
    if (w >= h) {
      return img
        .resize({ width: preset.longEdge, withoutEnlargement: true })
        .webp({ quality: 86 })
        .toBuffer();
    }
    return img
      .resize({ height: preset.longEdge, withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
  }

  if (preset.width && preset.height && preset.kind === "cover") {
    return img
      .resize(preset.width, preset.height, { fit: "cover", position: "attention" })
      .webp({ quality: 86 })
      .toBuffer();
  }

  if (preset.width && preset.height) {
    return img
      .resize(preset.width, preset.height, { fit: "inside", withoutEnlargement: false })
      .webp({ quality: 86 })
      .toBuffer();
  }

  return img.webp({ quality: 86 }).toBuffer();
}

/**
 * Generate derivative files for each selected primary item (`variantKey === ""`) and preset id.
 * Creates additional `DeliveryPackageItem` rows with `variantKey = preset.id` and uploads to R2.
 */
export async function generatePresetExportsForPackage(options: {
  packageId: string;
  presetIds: string[];
  /** Optional limit — if set, only first N source items */
  maxSources?: number;
}) {
  const { packageId, presetIds, maxSources } = options;
  const presets = presetIds.map(getPresetById).filter((p): p is DeliveryPresetDef => p != null);
  if (!presets.length) {
    return { ok: false as const, error: "No valid presets." };
  }

  const pkg = await prisma.deliveryPackage.findUnique({
    where: { id: packageId },
    include: {
      project: true,
      items: { where: { variantKey: "" }, include: { mediaAsset: true } },
    },
  });
  if (!pkg) {
    return { ok: false as const, error: "Package not found." };
  }

  const sources = pkg.items.filter((i) => i.selectedForDelivery && i.mediaAsset.keyFull);
  const limited = maxSources != null ? sources.slice(0, maxSources) : sources;
  let created = 0;
  const errors: string[] = [];

  for (const item of limited) {
    const keyFull = item.mediaAsset.keyFull!;
    let src: Buffer;
    try {
      src = await getObjectBuffer(keyFull);
    } catch (e) {
      errors.push(`${item.id}: ${e instanceof Error ? e.message : "download failed"}`);
      continue;
    }

    const baseName = baseFilenameFromKey(keyFull, item.mediaAssetId);

    for (const preset of presets) {
      try {
        const body = await renderPresetBuffer(src, preset);
        const outKey = deliveryR2Key(pkg.project.slug, preset.folderPath, `${baseName}_${preset.id}`, "webp");
        await putObjectBuffer({
          key: outKey,
          body,
          contentType: "image/webp",
          access: "public-read",
        });

        const maxSort =
          (
            await prisma.deliveryPackageItem.findFirst({
              where: { deliveryPackageId: packageId },
              orderBy: { sortOrder: "desc" },
              select: { sortOrder: true },
            })
          )?.sortOrder ?? -1;

        await prisma.deliveryPackageItem.upsert({
          where: {
            deliveryPackageId_mediaAssetId_variantKey: {
              deliveryPackageId: packageId,
              mediaAssetId: item.mediaAssetId,
              variantKey: preset.id,
            },
          },
          update: {
            storageKey: outKey,
            selectedForDelivery: true,
            deliveryGroup: normalizeDeliveryGroupFromPreset(preset),
            licensedUsageTypes: defaultLicensedUsageTypes(normalizeDeliveryGroupFromPreset(preset)),
          },
          create: {
            deliveryPackageId: packageId,
            mediaAssetId: item.mediaAssetId,
            variantKey: preset.id,
            deliveryGroup: normalizeDeliveryGroupFromPreset(preset),
            altText: item.altText ?? item.mediaAsset.alt,
            storageKey: outKey,
            sortOrder: maxSort + 1,
            selectedForDelivery: true,
            licensedUsageTypes: defaultLicensedUsageTypes(normalizeDeliveryGroupFromPreset(preset)),
          },
        });
        created += 1;
      } catch (e) {
        errors.push(`${item.mediaAssetId}/${preset.id}: ${e instanceof Error ? e.message : "export failed"}`);
      }
    }
  }

  return { ok: true as const, created, errors };
}

function normalizeDeliveryGroupFromPreset(preset: DeliveryPresetDef): string {
  if (preset.id.startsWith("hero")) return "hero";
  if (preset.id.includes("instagram") || preset.id.includes("story") || preset.id.includes("linkedin") || preset.id.includes("youtube"))
    return "social";
  if (preset.id === "thumbnail") return "web";
  if (preset.id === "full_web") return "web";
  if (preset.id.startsWith("grid")) return "web";
  return normalizeDeliveryGroup("web") ?? "web";
}
