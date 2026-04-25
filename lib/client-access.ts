import { prisma } from "@/lib/prisma";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";

export type AccessMatch = {
  id: string;
  galleryId: string;
  gallerySlug: string;
  galleryTitle: string;
  expiresAt?: Date | null;
  allowDownload: boolean;
};

export type ResolveAccessResult =
  | { ok: true; access: AccessMatch }
  | { ok: false; error: string };

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

/**
 * Resolves an access code to a session-ready match, enforcing gallery status / type
 * (client-facing delivery gate).
 */
export async function resolveClientAccessCode(code: string): Promise<ResolveAccessResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter your access code." };
  }

  const accessTokens = await prisma.galleryAccessToken.findMany({
    where: { isActive: true },
    include: { gallery: true },
  });

  for (const access of accessTokens) {
    if (!access.gallery) continue;
    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) continue;
    if (!verifyAccessCode(trimmed, access.codeHash, access.codeSalt)) continue;

    if (!isGalleryViewableByClient(access.gallery)) {
      if (access.gallery.galleryType === "INTERNAL_REVIEW") {
        return {
          ok: false,
          error: "This gallery is not available for client viewing.",
        };
      }
      return {
        ok: false,
        error:
          "This gallery is not available yet. Contact the studio if you expected access.",
      };
    }

    return {
      ok: true,
      access: {
        id: access.id,
        galleryId: access.galleryId,
        gallerySlug: access.gallery.slug,
        galleryTitle: access.gallery.title,
        expiresAt: access.expiresAt,
        allowDownload: access.allowDownload,
      },
    };
  }

  return { ok: false, error: "Invalid access code." };
}

export async function findAccessByCode(code: string): Promise<AccessMatch | null> {
  const result = await resolveClientAccessCode(code);
  return result.ok ? result.access : null;
}
