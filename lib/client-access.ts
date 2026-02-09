import { prisma } from "@/lib/prisma";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

type AccessMatch = {
  id: string;
  galleryId: string;
  gallerySlug: string;
  galleryTitle: string;
  expiresAt?: Date | null;
  allowDownload: boolean;
};

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function hashAccessCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = sha256(`${salt}:${code}`);
  const hint = code.slice(-4).toUpperCase();
  return { hash, salt, hint };
}

export function verifyAccessCode(code: string, hash: string, salt: string) {
  const candidate = sha256(`${salt}:${code}`);
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

export async function findAccessByCode(code: string): Promise<AccessMatch | null> {
  const accessTokens = await prisma.galleryAccessToken.findMany({
    where: {
      isActive: true,
    },
    include: {
      gallery: true,
    },
  });

  for (const access of accessTokens) {
    if (!access.gallery) continue;
    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) continue;
    if (verifyAccessCode(code, access.codeHash, access.codeSalt)) {
      return {
        id: access.id,
        galleryId: access.galleryId,
        gallerySlug: access.gallery.slug,
        galleryTitle: access.gallery.title,
        expiresAt: access.expiresAt,
        allowDownload: access.allowDownload,
      };
    }
  }

  return null;
}
