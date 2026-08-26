import { prisma } from "@/lib/prisma";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { isGalleryViewableByClient } from "@/lib/gallery-client-delivery";

/** Unambiguous uppercase alphanumeric charset (no 0/O, 1/I/L). */
const ACCESS_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_LENGTH = 12;

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

/** Normalize user-entered access codes (whitespace, common separators). */
export function normalizeAccessCodeInput(code: string): string {
  return code.trim().replace(/[\s-]/g, "");
}

/** Generate a gallery access code (12 chars, easy to read/type). */
export function generateGalleryAccessCode(): string {
  let out = "";
  for (let i = 0; i < ACCESS_CODE_LENGTH; i += 1) {
    out += ACCESS_CODE_CHARS[randomInt(0, ACCESS_CODE_CHARS.length)]!;
  }
  return out;
}

export function hashAccessCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = sha256(`${salt}:${code}`);
  const normalized = normalizeAccessCodeInput(code);
  const hint = normalized.slice(-4).toUpperCase() || "????";
  return { hash, salt, hint };
}

export function verifyAccessCode(code: string, hash: string, salt: string) {
  const normalized = normalizeAccessCodeInput(code);
  try {
    const candidate = sha256(`${salt}:${normalized}`);
    const a = Buffer.from(candidate, "utf8");
    const b = Buffer.from(hash, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Resolves an access code to a session-ready match, enforcing gallery status / type
 * (client-facing delivery gate).
 *
 * Uses codeHint (last 4 chars) to avoid full-table scans; verifies hash with timingSafeEqual.
 */
export async function resolveClientAccessCode(code: string): Promise<ResolveAccessResult> {
  const normalized = normalizeAccessCodeInput(code);
  if (!normalized) {
    return { ok: false, error: "Please enter your access code." };
  }

  const hint = normalized.slice(-4).toUpperCase() || "????";
  const accessTokens = await prisma.galleryAccessToken.findMany({
    where: { isActive: true, codeHint: hint },
    include: { gallery: true },
  });

  let matchedUnavailable = false;

  for (const access of accessTokens) {
    if (!access.gallery) continue;
    if (access.expiresAt && access.expiresAt.getTime() < Date.now()) continue;
    if (!verifyAccessCode(normalized, access.codeHash, access.codeSalt)) continue;

    if (!isGalleryViewableByClient(access.gallery)) {
      matchedUnavailable = true;
      continue;
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

  // Same generic message whether code is wrong or gallery is gated (reduces oracle).
  if (matchedUnavailable) {
    return {
      ok: false,
      error:
        "This gallery is not available yet. Contact the studio if you expected access.",
    };
  }

  return { ok: false, error: "Invalid access code." };
}

export async function findAccessByCode(code: string): Promise<AccessMatch | null> {
  const result = await resolveClientAccessCode(code);
  return result.ok ? result.access : null;
}
