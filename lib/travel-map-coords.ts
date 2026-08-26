/**
 * Parse coordinates and Google Maps URLs / iframe embeds for travel itinerary maps.
 */

export type ParsedMapPoint = {
  lat: number;
  lng: number;
  label?: string;
};

function validCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Accept "40.7128, -74.0060" or "40.7128,-74.0060". */
export function parseLatLngPair(input: string): ParsedMapPoint | null {
  const raw = input.trim();
  if (!raw) return null;
  const m = raw.match(
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/
  );
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!validCoord(lat, lng)) return null;
  return { lat, lng };
}

/**
 * Normalize pasted Google Maps content:
 * - full iframe HTML → src URL
 * - short / share / embed URLs → cleaned URL string
 */
export function extractMapsUrlFromInput(input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  const iframeQuoted = raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  if (iframeQuoted?.[1]) return iframeQuoted[1].trim();

  const iframeBare = raw.match(/\bsrc\s*=\s*([^\s>]+)/i);
  if (iframeBare?.[1] && raw.toLowerCase().includes("iframe")) {
    return iframeBare[1].replace(/&amp;/g, "&").trim();
  }

  // Strip wrapping quotes
  return raw.replace(/^['"]|['"]$/g, "").replace(/&amp;/g, "&").trim();
}

export function isGoogleMapsEmbedUrl(urlString: string): boolean {
  try {
    const u = new URL(extractMapsUrlFromInput(urlString));
    const host = u.hostname.toLowerCase();
    return (
      (host === "www.google.com" ||
        host === "google.com" ||
        host === "maps.google.com" ||
        host.endsWith(".google.com")) &&
      u.pathname.includes("/maps/embed")
    );
  } catch {
    return false;
  }
}

/** Build a Google Maps embed URL from a place name (no API key). */
export function googleMapsEmbedFromQuery(query: string): string {
  const q = query.trim();
  if (!q) return "";
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=12&output=embed`;
}

/** Build a Google Maps embed URL centered on coordinates. */
export function googleMapsEmbedFromCoords(lat: number, lng: number, zoom = 12): string {
  if (!validCoord(lat, lng)) return "";
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export type RouteStop = {
  lat: number;
  lng: number;
  label?: string;
};

/**
 * Build a Nominatim-friendly place query for an itinerary day.
 * Never include narrative day titles — those make OSM return zero hits
 * (e.g. "Madrid, Exploring the plazas, Lisbon, Portugal").
 */
export function itineraryDayGeocodeQuery(input: {
  place?: string;
  title?: string;
  dayLabel?: string;
  destination?: string;
  region?: string;
}): string | null {
  const place = (input.place || "").trim();
  const title = (input.title || "").trim();
  const dayLabel = (input.dayLabel || "").trim();
  const region = (input.region || "").trim();

  let primary = place;

  // "Day 1 · Madrid" / "Day 1 - Madrid" → Madrid
  if (!primary && dayLabel) {
    const afterSep = dayLabel.split(/\s*[·\-–—|]\s*/).map((s) => s.trim()).filter(Boolean);
    const candidate = afterSep.length > 1 ? afterSep[afterSep.length - 1]! : "";
    if (candidate && !/^day\s*\d+/i.test(candidate) && candidate.length <= 80) {
      primary = candidate;
    } else if (
      afterSep.length === 1 &&
      !/^day\s*\d+$/i.test(dayLabel) &&
      dayLabel.length <= 80
    ) {
      // dayLabel is itself a place name, e.g. "Madrid"
      primary = dayLabel;
    }
  }

  // Short title that looks like a place name (not a sentence / activity line)
  if (!primary && title) {
    const words = title.split(/\s+/).filter(Boolean);
    const looksLikePlace =
      words.length >= 1 &&
      words.length <= 3 &&
      title.length <= 40 &&
      !/[.!?]/.test(title) &&
      !/^day\s*\d+/i.test(title) &&
      !/^(exploring|walking|visiting|discovering|touring|a|an|the|our|my)\b/i.test(title);
    if (looksLikePlace) primary = title;
  }

  // Trip-level fallback (location label / destination) — last resort
  if (!primary && input.destination) {
    const dest = input.destination.trim();
    if (dest && !/^day\s*\d+$/i.test(dest) && dest.length <= 80) {
      primary = dest;
    }
  }

  if (!primary) return null;
  if (/^day\s*\d+$/i.test(primary)) return null;

  // Optional region/country only — never append destination.
  // Destination is often a stale city (Lisbon) and "Madrid, Lisbon" returns zero hits.
  if (region && !primary.toLowerCase().includes(region.toLowerCase())) {
    return `${primary}, ${region}`;
  }
  return primary;
}

/** Collapse near-identical pins (duplicate Lisboa, etc.). */
export function dedupeMapStops<T extends RouteStop>(stops: T[], precision = 4): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const stop of stops) {
    if (!validCoord(stop.lat, stop.lng)) continue;
    const key = `${stop.lat.toFixed(precision)},${stop.lng.toFixed(precision)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stop);
  }
  return out;
}

/** Open-in-Google share/directions URL for one or more stops. */
export function googleMapsDirectionsUrl(stops: RouteStop[]): string {
  const unique = dedupeMapStops(stops);
  if (unique.length === 0) return "";
  if (unique.length === 1) {
    const s = unique[0]!;
    return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
  }
  const path = unique.map((s) => `${s.lat},${s.lng}`).join("/");
  return `https://www.google.com/maps/dir/${path}`;
}

/**
 * Iframe embed without API key.
 * 1 stop → place embed; 2+ → classic directions embed (saddr / daddr / to:).
 */
export function googleMapsDirectionsEmbed(stops: RouteStop[]): string {
  const unique = dedupeMapStops(stops);
  if (unique.length === 0) return "";
  if (unique.length === 1) {
    return googleMapsEmbedFromCoords(unique[0]!.lat, unique[0]!.lng);
  }
  const origin = unique[0]!;
  const rest = unique.slice(1);
  const dest = rest
    .map((s, i) => (i === 0 ? `${s.lat},${s.lng}` : `to:${s.lat},${s.lng}`))
    .join("+");
  return `https://maps.google.com/maps?f=d&saddr=${origin.lat},${origin.lng}&daddr=${dest}&output=embed`;
}

/**
 * Extract one or more points from a Google Maps (or Apple Maps) URL / embed.
 * Handles iframe pb embeds (!2dLNG!3dLAT), @lat,lng, !3d/!4d, q=, ll=, /dir/.
 */
export function parseMapsUrlPoints(urlString: string): ParsedMapPoint[] {
  const cleaned = extractMapsUrlFromInput(urlString);
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    // Sometimes only the pb= fragment is pasted
    return parsePbPoints(cleaned);
  }

  const points: ParsedMapPoint[] = [];
  const seen = new Set<string>();

  function push(lat: number, lng: number, label?: string) {
    if (!validCoord(lat, lng)) return;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push({ lat, lng, label });
  }

  const href = decodeURIComponent(url.href);
  const pb = url.searchParams.get("pb") || "";

  // Google embed pb: !2dLNG!3dLAT (center) — note lng then lat
  for (const m of `${href} ${pb}`.matchAll(/!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)/g)) {
    push(Number(m[2]), Number(m[1]));
  }

  // @lat,lng,zoom
  for (const m of href.matchAll(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,\d+\.?\d*z)?/g)) {
    push(Number(m[1]), Number(m[2]));
  }

  // !3dLAT!4dLNG (place marker)
  for (const m of `${href} ${pb}`.matchAll(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/g)) {
    push(Number(m[1]), Number(m[2]));
  }

  // q=lat,lng or query=lat,lng
  for (const key of ["q", "query", "ll", "center"]) {
    const v = url.searchParams.get(key);
    if (!v) continue;
    const decoded = decodeURIComponent(v.replace(/\+/g, " "));
    const pair = parseLatLngPair(decoded);
    if (pair) push(pair.lat, pair.lng);
  }

  // /maps/dir/A/B/C/ or /dir/lat,lng/lat,lng/
  const dirMatch = url.pathname.match(/\/dir\/(.+)/i);
  if (dirMatch?.[1]) {
    const parts = dirMatch[1].split("/").filter(Boolean);
    for (const part of parts) {
      const decoded = decodeURIComponent(part.replace(/\+/g, " "));
      if (decoded === "data" || decoded.startsWith("data=")) continue;
      const pair = parseLatLngPair(decoded);
      if (pair) push(pair.lat, pair.lng);
    }
  }

  const appleLl = url.searchParams.get("ll");
  if (appleLl) {
    const pair = parseLatLngPair(appleLl);
    if (pair) push(pair.lat, pair.lng);
  }

  return points;
}

function parsePbPoints(raw: string): ParsedMapPoint[] {
  const points: ParsedMapPoint[] = [];
  const seen = new Set<string>();
  function push(lat: number, lng: number) {
    if (!validCoord(lat, lng)) return;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    points.push({ lat, lng });
  }
  for (const m of raw.matchAll(/!2d(-?\d+\.?\d*)!3d(-?\d+\.?\d*)/g)) {
    push(Number(m[2]), Number(m[1]));
  }
  for (const m of raw.matchAll(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/g)) {
    push(Number(m[1]), Number(m[2]));
  }
  return points;
}

export function isShortMapsLink(urlString: string): boolean {
  try {
    const host = new URL(extractMapsUrlFromInput(urlString)).hostname.toLowerCase();
    return (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host.endsWith(".app.goo.gl") ||
      host === "g.co"
    );
  } catch {
    return false;
  }
}

/** Allow only https Google Maps links for public “Open in Maps” anchors (blocks javascript:). */
export function safeExternalMapsHref(raw: string | undefined | null): string {
  const cleaned = extractMapsUrlFromInput(raw || "");
  if (!cleaned) return "";
  try {
    const u = new URL(cleaned);
    if (u.protocol !== "https:") return "";
    const host = u.hostname.toLowerCase();
    const allowed =
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      host === "g.co" ||
      host.endsWith(".app.goo.gl") ||
      host === "google.com" ||
      host === "www.google.com" ||
      host === "maps.google.com" ||
      host.endsWith(".google.com");
    return allowed ? u.toString() : "";
  } catch {
    return "";
  }
}

