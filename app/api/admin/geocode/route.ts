import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { resolveMapsPoints } from "@/lib/maps-geocode";
import { googleMapsEmbedFromCoords, googleMapsEmbedFromQuery } from "@/lib/travel-map-coords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin geocode helper via OpenStreetMap Nominatim (no API key).
 * Also resolves Google Maps URLs (including short goo.gl links) into coordinates.
 */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "travel-geocode", max: 40, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many geocode requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;
  const body = raw.value as Record<string, unknown>;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const mapsUrlRaw = typeof body.mapsUrl === "string" ? body.mapsUrl.trim() : "";

  if (!query && !mapsUrlRaw) return jsonErr("query or mapsUrl is required.", 400);
  if (query.length > 8000 || mapsUrlRaw.length > 8000) return jsonErr("Input is too long.", 400);

  try {
    const result = await resolveMapsPoints({ query, mapsUrl: mapsUrlRaw });
    const embedUrl = result.results[0]
      ? googleMapsEmbedFromCoords(result.results[0].lat, result.results[0].lng)
      : query
        ? googleMapsEmbedFromQuery(query)
        : null;
    return NextResponse.json({
      ok: true,
      results: result.results,
      resolvedUrl: result.resolvedUrl,
      embedUrl,
    });
  } catch (err) {
    console.error("TRAVEL_GEOCODE_ERROR", err);
    return jsonErr(err instanceof Error ? err.message : "Geocode failed.", 502);
  }
}
