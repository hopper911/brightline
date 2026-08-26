import { NextResponse } from "next/server";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { resolveMapsPoints } from "@/lib/maps-geocode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public (rate-limited) resolve of Maps URL / place name → lat/lng
 * so itinerary maps can use dark Leaflet tiles instead of a light Google iframe.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "maps-resolve-point", max: 60, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  // Prefer same-site callers (itinerary UI); still allow privacy browsers with no Sec-Fetch-Site.
  const fetchSite = (req.headers.get("sec-fetch-site") || "").toLowerCase();
  if (fetchSite === "cross-site") {
    return NextResponse.json({ ok: false, error: "Forbidden origin." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const query = typeof row.query === "string" ? row.query.trim() : "";
  const mapsUrl = typeof row.mapsUrl === "string" ? row.mapsUrl.trim() : "";

  if (!query && !mapsUrl) {
    return NextResponse.json({ ok: false, error: "query or mapsUrl is required." }, { status: 400 });
  }
  if (query.length > 8000 || mapsUrl.length > 8000) {
    return NextResponse.json({ ok: false, error: "Input is too long." }, { status: 400 });
  }

  try {
    const result = await resolveMapsPoints({ query, mapsUrl });
    if (!result.results.length) {
      return NextResponse.json({ ok: false, error: "No coordinates found." }, { status: 422 });
    }
    return NextResponse.json({
      ok: true,
      results: result.results,
      resolvedUrl: result.resolvedUrl,
    });
  } catch (err) {
    console.error("MAPS_RESOLVE_POINT_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Resolve failed." },
      { status: 422 }
    );
  }
}
