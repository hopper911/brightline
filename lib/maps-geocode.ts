/**
 * Shared Maps URL expand + Nominatim geocode for travel itinerary pins.
 * Expand fetches are host-allowlisted + SSRF-checked (public `/api/maps/resolve-point`).
 */

import { assertPublicHttpUrlResolved } from "@/lib/ssrf-guard";
import {
  extractMapsUrlFromInput,
  isShortMapsLink,
  parseLatLngPair,
  parseMapsUrlPoints,
} from "@/lib/travel-map-coords";

export type MapsGeoHit = { lat: number; lng: number; label: string };

const MAPS_EXPAND_USER_AGENT =
  "Mozilla/5.0 (compatible; BRIGHTLINE-TravelMap/1.0; +https://brightlinephotography.com)";

/** Hosts we are allowed to hit when expanding short Maps links. */
function isAllowedMapsExpandHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host) return false;
  if (host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.co") return true;
  if (host.endsWith(".app.goo.gl")) return true;
  if (host === "google.com" || host === "www.google.com" || host === "maps.google.com") return true;
  if (host.endsWith(".google.com") || host.endsWith(".googleusercontent.com")) return true;
  return false;
}

async function assertAllowedMapsFetchUrl(rawUrl: string): Promise<URL> {
  const url = await assertPublicHttpUrlResolved(rawUrl);
  if (!isAllowedMapsExpandHost(url.hostname)) {
    throw new Error("Maps URL host is not allowed.");
  }
  return url;
}

export async function nominatimSearch(query: string): Promise<MapsGeoHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  const upstream = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "BRIGHTLINE-Photography-TravelMap/1.0 (+https://brightlinephotography.com)",
    },
    next: { revalidate: 0 },
  });
  if (!upstream.ok) {
    throw new Error(`Geocode failed (${upstream.status}).`);
  }
  const data = (await upstream.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;
  return (Array.isArray(data) ? data : [])
    .map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat,
        lng,
        label: typeof row.display_name === "string" ? row.display_name : query,
      } satisfies MapsGeoHit;
    })
    .filter(Boolean)
    .slice(0, 5) as MapsGeoHit[];
}

/**
 * Follow redirects to expand short Google Maps links (maps.app.goo.gl).
 * Only Google short-link hosts are fetched; each hop is SSRF-checked + host-allowlisted.
 */
export async function expandMapsUrl(input: string): Promise<string> {
  const cleaned = extractMapsUrlFromInput(input);
  if (!cleaned || !isShortMapsLink(cleaned)) {
    throw new Error("Only Google Maps short links can be expanded.");
  }

  let current = (await assertAllowedMapsFetchUrl(cleaned)).toString();

  for (let i = 0; i < 5; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": MAPS_EXPAND_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const loc = res.headers.get("location");
    if (
      loc &&
      (res.status === 301 ||
        res.status === 302 ||
        res.status === 303 ||
        res.status === 307 ||
        res.status === 308)
    ) {
      const next = new URL(loc, current).toString();
      current = (await assertAllowedMapsFetchUrl(next)).toString();
      continue;
    }
    break;
  }

  return current;
}

export type ResolveMapsPointInput = {
  query?: string;
  mapsUrl?: string;
};

export type ResolveMapsPointResult = {
  results: MapsGeoHit[];
  resolvedUrl: string | null;
};

/**
 * Resolve a Maps URL and/or place query into one or more lat/lng pins.
 */
export async function resolveMapsPoints(
  input: ResolveMapsPointInput
): Promise<ResolveMapsPointResult> {
  const query = (input.query || "").trim();
  const mapsUrlRaw = (input.mapsUrl || "").trim();
  const mapsUrl = extractMapsUrlFromInput(
    mapsUrlRaw ||
      (query.includes("iframe") ||
      query.includes("maps/embed") ||
      query.startsWith("http")
        ? query
        : "")
  );

  if (!query && !mapsUrlRaw && !mapsUrl) {
    throw new Error("query or mapsUrl is required.");
  }

  // Direct lat,lng paste
  if (query && !query.includes("http") && !query.includes("iframe") && !query.includes("!2d")) {
    const pair = parseLatLngPair(query);
    if (pair) {
      return {
        results: [{ lat: pair.lat, lng: pair.lng, label: `${pair.lat}, ${pair.lng}` }],
        resolvedUrl: null,
      };
    }
  }

  const urlInput = mapsUrl || extractMapsUrlFromInput(mapsUrlRaw);
  if (urlInput && (urlInput.startsWith("http") || urlInput.includes("!2d") || urlInput.includes("pb="))) {
    let resolved = urlInput.startsWith("http")
      ? urlInput
      : `https://www.google.com/maps/embed?pb=${urlInput.replace(/^pb=/i, "")}`;

    // Only expand genuine short links (hostname allowlist) — never substring matches.
    if (isShortMapsLink(resolved)) {
      resolved = await expandMapsUrl(resolved);
    }

    const points = parseMapsUrlPoints(resolved);
    if (points.length > 0) {
      return {
        results: points.map((p, i) => ({
          lat: p.lat,
          lng: p.lng,
          label: p.label || `Stop ${i + 1}`,
        })),
        resolvedUrl: resolved,
      };
    }
    try {
      const u = new URL(resolved);
      const qParam = u.searchParams.get("q") || u.searchParams.get("query");
      const place =
        (qParam && decodeURIComponent(qParam.replace(/\+/g, " "))) ||
        decodeURIComponent(u.pathname.split("/").filter(Boolean).pop()?.replace(/\+/g, " ") || "");
      if (
        place &&
        place.length >= 2 &&
        !place.startsWith("@") &&
        place !== "maps" &&
        place !== "embed" &&
        place !== "place" &&
        place !== "search"
      ) {
        const results = await nominatimSearch(place.replace(/-/g, " "));
        if (results.length) {
          return { results, resolvedUrl: resolved };
        }
      }
    } catch {
      // fall through
    }
    if (query.length >= 2) {
      const results = await nominatimSearch(query);
      if (results.length) return { results, resolvedUrl: resolved };
    }
    throw new Error(
      "Could not read coordinates from that Google link. Add a location label or pin stops."
    );
  }

  if (query.length < 2) {
    throw new Error("query is required.");
  }
  const results = await nominatimSearch(query);
  return { results, resolvedUrl: null };
}
