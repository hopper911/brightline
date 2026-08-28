import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { signGalleryAssetViaMediaService } from "@/lib/platform/media/integrations/gallery-asset-sign";
import { defaultMediaService } from "@/lib/platform/media/server";
import { getObjectBuffer, putObjectBuffer, signGet } from "@/lib/storage-r2";

const LOW_RES_MAX_WIDTH = 2200;
const LOW_RES_QUALITY = 82;

function filenameStem(value: string) {
  return value
    .split("/")
    .pop()
    ?.replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]/g, "-") || "image";
}

export async function generateLowResForGalleryImage(imageId: string) {
  const image = await prisma.galleryImage.findUnique({
    where: { id: imageId },
    select: { id: true, galleryId: true, storageKey: true, filename: true },
  });
  if (!image?.storageKey) {
    throw new Error("Image does not have a high-resolution storage key.");
  }

  const source = await getObjectBuffer(image.storageKey);
  const pipeline = sharp(source, { failOn: "none" }).rotate();
  const metadata = await pipeline.metadata();
  const lowResBuffer = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: LOW_RES_MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: LOW_RES_QUALITY, mozjpeg: true })
    .toBuffer();
  const lowMeta = await sharp(lowResBuffer).metadata();

  const lowResStorageKey = `client-galleries/${image.galleryId}/low-res/${image.id}-${filenameStem(
    image.filename ?? image.storageKey
  )}.jpg`;

  await putObjectBuffer({
    key: lowResStorageKey,
    body: lowResBuffer,
    contentType: "image/jpeg",
    access: "private",
  });

  return prisma.galleryImage.update({
    where: { id: image.id },
    data: {
      lowResStorageKey,
      lowResWidth: lowMeta.width ?? null,
      lowResHeight: lowMeta.height ?? null,
      lowResBytes: lowResBuffer.byteLength,
      highResWidth: metadata.width ?? null,
      highResHeight: metadata.height ?? null,
      highResBytes: source.byteLength,
    },
  });
}

export async function signGalleryAsset(key: string | null | undefined, expiresIn = 3600) {
  if (!key) return null;

  if (isPlatformFeatureEnabled("media")) {
    return signGalleryAssetViaMediaService(defaultMediaService, {
      objectKey: key,
      expiresInSeconds: expiresIn,
    });
  }

  // Legacy path — unchanged until full migration (Phase 3E-1 flag off by default).
  return signGet({ key, expiresIn });
}
