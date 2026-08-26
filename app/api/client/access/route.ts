import { jsonErr, jsonOk } from "@/lib/api/http";
import { clientAccessCodeBodySchema } from "@/lib/api/client-package-schemas";
import { parseJsonWithSchema } from "@/lib/api/parse";
import { cookies } from "next/headers";
import { findAccessByCode } from "@/lib/client-access";
import {
  CLIENT_GALLERY_SESSION_MAX_AGE_SEC,
  createClientGallerySessionToken,
} from "@/lib/client-gallery-session-token";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "client-access", max: 10, windowMs: 15 * 60_000 })) {
    return jsonErr("Too many attempts. Try again later.", 429);
  }

  const parsed = await parseJsonWithSchema(req, clientAccessCodeBodySchema);
  if (!parsed.ok) return parsed.response;

  const entry = await findAccessByCode(parsed.data.code.trim());
  if (!entry) {
    return jsonErr("Invalid access code.", 401);
  }

  const sessionToken = createClientGallerySessionToken(entry.id);
  if (!sessionToken) {
    return jsonErr("Unable to create access session.", 503);
  }

  const jar = await cookies();
  const cookieBase = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(req),
    maxAge: CLIENT_GALLERY_SESSION_MAX_AGE_SEC,
  };

  jar.set("client_access", "true", cookieBase);
  jar.set("client_gallery", entry.gallerySlug, cookieBase);
  jar.set("client_access_session", sessionToken, cookieBase);
  // Clear legacy bare-id cookie so sessions are not spoofable via cuid alone.
  jar.set("client_access_id", "", { ...cookieBase, maxAge: 0 });

  return jsonOk({ url: `/client/${entry.gallerySlug}` });
}
