import { jsonErr, jsonOk } from "@/lib/api/http";
import { clientValidateBodySchema } from "@/lib/api/client-package-schemas";
import { parseJsonWithSchema } from "@/lib/api/parse";
import { cookies } from "next/headers";
import { resolveClientAccessCode } from "@/lib/client-access";
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

  const parsed = await parseJsonWithSchema(req, clientValidateBodySchema);
  if (!parsed.ok) return parsed.response;

  const resolved = await resolveClientAccessCode(parsed.data.token.trim());
  if (!resolved.ok) {
    return jsonErr(resolved.error, 404);
  }
  const access = resolved.access;

  const sessionToken = createClientGallerySessionToken(access.id);
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
  jar.set("client_gallery", access.gallerySlug, cookieBase);
  jar.set("client_access_session", sessionToken, cookieBase);
  jar.set("client_access_id", "", { ...cookieBase, maxAge: 0 });

  return jsonOk({
    galleryId: access.galleryId,
    slug: access.gallerySlug,
    url: `/client/${access.gallerySlug}`,
  });
}
