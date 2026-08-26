/**
 * Google Places (New) helpers for importing Local Guide review photos into blog posts.
 */

import { extractMapsUrlFromInput, isShortMapsLink } from "@/lib/travel-map-coords";
import type { GoogleMapsContributorSettings } from "@/lib/google-maps-contributor";
import { DEFAULT_GOOGLE_REVIEW_AVATAR } from "@/lib/google-maps-contributor";
import { getPublicR2Url } from "@/lib/r2";
import { putObjectBuffer } from "@/lib/storage-r2";

function authorSnapshotFromSettings(settings: GoogleMapsContributorSettings): {
  authorName: string;
  authorAvatarUrl: string;
} {
  return {
    authorName: settings.displayNameHint.trim() || "Kiril",
    authorAvatarUrl: settings.avatarUrl.trim() || DEFAULT_GOOGLE_REVIEW_AVATAR,
  };
}

export type ParsedMapsReviewUrl = {
  placeId: string | null;
  /** Free-text query when Place ID is missing or may be stale. */
  placeQuery: string | null;
  contributorId: string | null;
  mapsUrl: string;
  /** When the pasted input was a review share link, keep it for the public card. */
  reviewShareUrl?: string | null;
};

export type GooglePlaceAuthor = {
  displayName: string;
  uri: string;
  photoUri: string;
};

export type GooglePlacePhotoPreview = {
  name: string;
  widthPx: number;
  heightPx: number;
  previewUri: string;
  authors: GooglePlaceAuthor[];
  matchedContributor: boolean;
};

export type GooglePlaceReviewPreview = {
  rating: number;
  text: string;
  relativeTime: string;
  mapsUri: string;
  author: GooglePlaceAuthor | null;
  matchedContributor: boolean;
};

export type GoogleReviewImportPreview = {
  placeId: string;
  placeName: string;
  placeAddress: string;
  mapsUrl: string;
  matchedPhotoCount: number;
  matchedReview: GooglePlaceReviewPreview | null;
  photos: GooglePlacePhotoPreview[];
  filterNote: string | null;
  contributorIdUsed: string;
};

export type GoogleReviewCardPayload = {
  enabled: boolean;
  placeId: string;
  placeName: string;
  placeAddress: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
  mapsUrl: string;
  authorName: string;
  authorAvatarUrl: string;
};

export type GoogleReviewImportResult = {
  galleryImages: { url: string; alt: string }[];
  googleReview: GoogleReviewCardPayload | null;
  photoCreditsSuggestion: string;
  coverImageUrl: string | null;
  libraryMeta: {
    placeId: string;
    placeName: string;
    placeAddress: string;
    rating: number;
    reviewText: string;
    relativeTime: string;
    mapsUrl: string;
  };
};

type PlacesAuthorAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

type PlacesPhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: PlacesAuthorAttribution[];
};

type PlacesReview = {
  rating?: number;
  text?: { text?: string };
  relativePublishTimeDescription?: string;
  googleMapsUri?: string;
  authorAttribution?: PlacesAuthorAttribution;
};

type PlacesDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  googleMapsUri?: string;
  photos?: PlacesPhoto[];
  reviews?: PlacesReview[];
  error?: { message?: string; status?: string };
};

function placesApiKey(): string {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not configured. Enable Places API (New) and set the key in Vercel."
    );
  }
  return key;
}

function normalizeAttributionUri(uri: string): string {
  const raw = uri.trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}

function authorFrom(attr: PlacesAuthorAttribution | undefined | null): GooglePlaceAuthor | null {
  if (!attr) return null;
  return {
    displayName: (attr.displayName ?? "").trim(),
    uri: normalizeAttributionUri(attr.uri ?? ""),
    photoUri: normalizeAttributionUri(attr.photoUri ?? ""),
  };
}

function attributionMatches(
  attr: PlacesAuthorAttribution | undefined | null,
  settings: GoogleMapsContributorSettings
): boolean {
  if (!attr) return false;
  const uri = normalizeAttributionUri(attr.uri ?? "");
  const id = settings.contributorId.trim();
  if (id && uri.includes(id)) return true;
  const hint = settings.displayNameHint.trim().toLowerCase();
  const name = (attr.displayName ?? "").trim().toLowerCase();
  if (hint && name && (name === hint || name.startsWith(`${hint} `) || name.includes(` ${hint}`))) {
    return true;
  }
  return false;
}

/**
 * Follow maps.app.goo.gl / goo.gl short links to the final Maps URL.
 * Share links often encode a cid/ftid instead of a ChIJ Place ID.
 * Manual redirects + Google host allowlist (SSRF-safe).
 */
function isAllowedMapsExpandHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "maps.app.goo.gl" ||
    h === "goo.gl" ||
    h === "g.co" ||
    h.endsWith(".app.goo.gl") ||
    h === "google.com" ||
    h === "www.google.com" ||
    h === "maps.google.com" ||
    h.endsWith(".google.com")
  );
}

export async function expandMapsShortUrl(input: string): Promise<string> {
  const cleaned = extractMapsUrlFromInput(input);
  if (!cleaned) return "";
  let href = cleaned;
  if (href.startsWith("//")) href = `https:${href}`;
  if (!/^https?:\/\//i.test(href)) return cleaned;
  if (!isShortMapsLink(href)) return href;

  try {
    const { assertPublicHttpUrlResolved } = await import("@/lib/ssrf-guard");
    let current = (await assertPublicHttpUrlResolved(href)).toString();
    if (!isAllowedMapsExpandHost(new URL(current).hostname)) return href;

    for (let hop = 0; hop < 6; hop++) {
      if (!isAllowedMapsExpandHost(new URL(current).hostname)) return href;

      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BrightlinePhotography/1.0; +https://brightlinephotography.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.get("location")?.trim();
        if (!location) break;
        current = (await assertPublicHttpUrlResolved(new URL(location, current).toString())).toString();
        continue;
      }

      if (res.ok || res.status === 404) {
        return isAllowedMapsExpandHost(new URL(current).hostname) ? current : href;
      }
      break;
    }
  } catch {
    /* keep original */
  }
  return href;
}

/** Extract Google Maps cid (decimal string) from expanded URLs / ftid hex pairs. */
export function extractMapsCid(urlString: string): string | null {
  const raw = urlString.trim();
  if (!raw) return null;

  const cidParam = raw.match(/[?&#]cid=(\d{6,})/i);
  if (cidParam?.[1]) return cidParam[1];

  // !1s0x0:0x8e02881790d1aac8  or  0x89c2…:0x8e02…
  const ftid = raw.match(/0x[0-9a-f]+:0x([0-9a-f]+)/i);
  if (ftid?.[1]) {
    try {
      return BigInt(`0x${ftid[1]}`).toString();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolve a Maps cid → Place ID.
 * Prefer Places API (New) text search with a cid Maps URL (same key already works for imports).
 * Fall back to legacy Place Details `cid=` when available.
 */
async function resolvePlaceIdFromCid(cid: string): Promise<string | null> {
  const mapsCidUrl = `https://www.google.com/maps?cid=${cid}`;

  // Places API (New) — often accepts the Maps cid URL as a text query.
  for (const query of [mapsCidUrl, `cid:${cid}`]) {
    try {
      const found = await searchPlaceIdByText(query);
      if (found) return found;
    } catch {
      /* try next strategy */
    }
  }

  const key = placesApiKey();
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("cid", cid);
  url.searchParams.set("fields", "place_id,name");
  url.searchParams.set("key", key);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    status?: string;
    error_message?: string;
    result?: { place_id?: string };
  };
  if (json.status === "OK" && json.result?.place_id) {
    return json.result.place_id.trim();
  }
  return null;
}

/**
 * Expand short links and fill in Place ID from cid when the URL has no ChIJ / name.
 * Pass `placeQueryOverride` when the URL is a review share link (no Place ID from Google).
 */
export async function resolveMapsReviewInput(
  input: string,
  placeQueryOverride?: string
): Promise<ParsedMapsReviewUrl | null> {
  const expanded = await expandMapsShortUrl(input);
  const expandedLower = expanded.toLowerCase();
  const isReviewLink =
    expandedLower.includes("/maps/reviews/") || expandedLower.includes("/maps/review/");
  const reviewShareUrl = isReviewLink ? (expanded || input.trim()) : null;
  const placeOverride = placeQueryOverride?.trim() || "";

  if (isReviewLink && !placeOverride) {
    throw new Error(
      "REVIEW_NEEDS_PLACE: That link is a review share. Enter the place name below (e.g. Twin Tails New York), then preview again — your review card can still use this share link."
    );
  }

  if (placeOverride) {
    return {
      placeId: null,
      placeQuery: placeOverride,
      contributorId: null,
      mapsUrl: reviewShareUrl || expanded || input.trim(),
      reviewShareUrl,
    };
  }

  let parsed = parseMapsReviewUrl(expanded) ?? parseMapsReviewUrl(input);

  if (parsed?.placeId || parsed?.placeQuery) {
    return {
      ...parsed,
      mapsUrl: expanded || parsed.mapsUrl,
      reviewShareUrl: parsed.reviewShareUrl ?? null,
    };
  }

  const cid = extractMapsCid(expanded) || extractMapsCid(input);
  if (cid) {
    const placeId = await resolvePlaceIdFromCid(cid);
    if (placeId) {
      return {
        placeId,
        placeQuery: null,
        contributorId: parsed?.contributorId ?? null,
        mapsUrl: expanded || `https://www.google.com/maps?cid=${cid}`,
        reviewShareUrl: null,
      };
    }
    throw new Error(
      "That share link was recognized, but Google didn’t return a Place ID for it. Enter the place name below and preview again."
    );
  }

  return parsed
    ? { ...parsed, reviewShareUrl: parsed.reviewShareUrl ?? null }
    : null;
}

/**
 * Extract Place ID + optional contributor id / place name from a Maps share / contrib / place URL.
 */
export function parseMapsReviewUrl(input: string): ParsedMapsReviewUrl | null {
  const cleaned = extractMapsUrlFromInput(input);
  if (!cleaned) return null;

  const asQueryOnly = (query: string, mapsUrl: string, contributorId: string | null = null): ParsedMapsReviewUrl => ({
    placeId: null,
    placeQuery: query.trim(),
    contributorId,
    mapsUrl,
  });

  let href = cleaned;
  try {
    if (href.startsWith("//")) href = `https:${href}`;
    const u = new URL(href);

    let contributorId: string | null = null;
    const contribMatch = u.pathname.match(/\/maps\/contrib\/(\d+)/i);
    if (contribMatch?.[1]) contributorId = contribMatch[1];

    // /maps/place/Twin+Tails/@lat,lng or /maps/place/Twin+Tails/
    const namedPlace = u.pathname.match(/\/maps\/place\/([^/]+)/i);
    if (namedPlace?.[1] && !/^ChIJ/i.test(namedPlace[1])) {
      const decoded = decodeURIComponent(namedPlace[1].replace(/\+/g, " ")).trim();
      if (decoded && !decoded.startsWith("@")) {
        // Prefer ChIJ in the same URL when present
        const data = `${u.pathname}${u.search}${u.hash}`;
        const chij = data.match(/!1s(ChIJ[\w-]+)/i) || data.match(/(ChIJ[\w-]{20,})/);
        if (chij?.[1]) {
          return {
            placeId: chij[1],
            placeQuery: decoded,
            contributorId,
            mapsUrl: u.toString(),
          };
        }
        return asQueryOnly(decoded, u.toString(), contributorId);
      }
    }

    // /maps/contrib/…/place/ChIJ…
    const placeInPath = u.pathname.match(/\/place\/(ChIJ[\w-]+)/i);
    if (placeInPath?.[1]) {
      return {
        placeId: placeInPath[1],
        placeQuery: null,
        contributorId,
        mapsUrl: u.toString(),
      };
    }

    const qPlace = u.searchParams.get("place_id") || u.searchParams.get("query_place_id");
    if (qPlace && /^ChIJ[\w-]+$/i.test(qPlace)) {
      return { placeId: qPlace, placeQuery: null, contributorId, mapsUrl: u.toString() };
    }

    const q = u.searchParams.get("q") || u.searchParams.get("query") || "";
    const qId = q.match(/place_id:(ChIJ[\w-]+)/i);
    if (qId?.[1]) {
      return { placeId: qId[1], placeQuery: null, contributorId, mapsUrl: u.toString() };
    }
    if (q.trim() && !/^https?:/i.test(q)) {
      return asQueryOnly(q.trim(), u.toString(), contributorId);
    }

    const data = `${u.pathname}${u.search}${u.hash}`;
    const chijInData = data.match(/!1s(ChIJ[\w-]+)/i) || data.match(/(ChIJ[\w-]{20,})/);
    if (chijInData?.[1]) {
      return {
        placeId: chijInData[1],
        placeQuery: null,
        contributorId,
        mapsUrl: u.toString(),
      };
    }
  } catch {
    /* fall through */
  }

  const contrib = cleaned.match(/\/maps\/contrib\/(\d+)/i);
  const place = cleaned.match(/\/place\/(ChIJ[\w-]+)/i) || cleaned.match(/(ChIJ[\w-]{20,})/);
  if (place?.[1]) {
    return {
      placeId: place[1],
      placeQuery: null,
      contributorId: contrib?.[1] ?? null,
      mapsUrl: cleaned.startsWith("http")
        ? cleaned
        : `https://www.google.com/maps/place/?q=place_id:${place[1]}`,
    };
  }

  const bare = cleaned.trim();
  if (/^ChIJ[\w-]+$/i.test(bare)) {
    return {
      placeId: bare,
      placeQuery: null,
      contributorId: null,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${bare}`,
    };
  }

  // Plain place name pasted into the field
  if (bare.length >= 3 && !bare.includes("://") && !/[{}<>]/.test(bare)) {
    return asQueryOnly(bare, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bare)}`);
  }

  return null;
}

async function searchPlaceIdByText(query: string): Promise<string | null> {
  const key = placesApiKey();
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({ textQuery: query, pageSize: 1 }),
    cache: "no-store",
  });
  const json = (await res.json()) as {
    places?: Array<{ id?: string; displayName?: { text?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `Places text search failed (${res.status}).`);
  }
  const id = json.places?.[0]?.id?.trim();
  return id || null;
}

async function fetchPlaceDetails(placeId: string): Promise<PlacesDetailsResponse> {
  const key = placesApiKey();
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,googleMapsUri,photos,reviews",
    },
    cache: "no-store",
  });
  const json = (await res.json()) as PlacesDetailsResponse;
  if (!res.ok) {
    const msg = json.error?.message || `Places API error (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

async function resolvePlaceDetails(parsed: ParsedMapsReviewUrl): Promise<PlacesDetailsResponse> {
  const tryIds: string[] = [];
  if (parsed.placeId) tryIds.push(parsed.placeId);

  let lastError: Error | null = null;
  for (const placeId of tryIds) {
    try {
      return await fetchPlaceDetails(placeId);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      // Stale / invalid IDs (common on older contrib URLs) → fall through to text search
      if (!msg.includes("no longer valid") && !msg.includes("not found") && !msg.includes("invalid")) {
        throw lastError;
      }
    }
  }

  const query = parsed.placeQuery?.trim();
  if (query) {
    const foundId = await searchPlaceIdByText(query);
    if (foundId) return fetchPlaceDetails(foundId);
  }

  // Last resort for contrib place URLs with a dead ChIJ and no name in the path
  if (parsed.placeId && !query) {
    throw new Error(
      `${lastError?.message || "Place ID is invalid."} Open the place in Google Maps → Share → copy that link, or paste the place name (e.g. “Twin Tails New York”).`
    );
  }

  throw lastError || new Error("Could not resolve that Maps place.");
}

async function fetchPhotoPreviewUri(photoName: string): Promise<string> {
  const key = placesApiKey();
  const name = photoName.replace(/\/media$/i, "");
  const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
  url.searchParams.set("maxWidthPx", "400");
  url.searchParams.set("maxHeightPx", "400");
  url.searchParams.set("skipHttpRedirect", "true");
  url.searchParams.set("key", key);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return "";
  const json = (await res.json()) as { photoUri?: string };
  return (json.photoUri ?? "").trim();
}

async function fetchPhotoBytes(photoName: string): Promise<{ buffer: Buffer; contentType: string }> {
  const key = placesApiKey();
  const name = photoName.replace(/\/media$/i, "");
  const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
  url.searchParams.set("maxWidthPx", "2400");
  url.searchParams.set("maxHeightPx", "2400");
  url.searchParams.set("key", key);
  const res = await fetch(url.toString(), { cache: "no-store", redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to download Place Photo (${res.status}).`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error("Place Photo response was empty.");
  return { buffer, contentType };
}

function extensionForContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

type PlaceImportContext = {
  placeId: string;
  placeName: string;
  placeAddress: string;
  mapsUrl: string;
  /** Prefer this on the public review card when the user pasted a review share link. */
  reviewShareUrl: string | null;
  photos: PlacesPhoto[];
  matchedReview: GooglePlaceReviewPreview | null;
  contributorIdUsed: string;
  effectiveSettings: GoogleMapsContributorSettings;
};

async function loadPlaceImportContext(
  mapsInput: string,
  settings: GoogleMapsContributorSettings,
  placeQueryOverride?: string
): Promise<PlaceImportContext> {
  const parsed = await resolveMapsReviewInput(mapsInput, placeQueryOverride);
  if (!parsed?.placeId && !parsed?.placeQuery) {
    throw new Error(
      "Could not find a place in that input. Paste a Maps place URL, review share link + place name, or a place name."
    );
  }

  const contributorIdUsed =
    settings.contributorId.trim() || parsed.contributorId?.trim() || "";

  const effectiveSettings: GoogleMapsContributorSettings = {
    ...settings,
    contributorId: contributorIdUsed || settings.contributorId,
  };

  const details = await resolvePlaceDetails(parsed);
  const placeId = details.id || parsed.placeId || "";
  if (!placeId) {
    throw new Error("Places API did not return a Place ID for that search.");
  }
  const placeName = details.displayName?.text?.trim() || "Untitled place";
  const placeAddress = details.formattedAddress?.trim() || "";
  const reviewShareUrl = parsed.reviewShareUrl?.trim() || null;
  const mapsUrl =
    reviewShareUrl || details.googleMapsUri?.trim() || parsed.mapsUrl;

  const reviewsRaw = Array.isArray(details.reviews) ? details.reviews : [];
  let matchedReview: GooglePlaceReviewPreview | null = null;
  for (const review of reviewsRaw) {
    const matched = attributionMatches(review.authorAttribution, effectiveSettings);
    const item: GooglePlaceReviewPreview = {
      rating: typeof review.rating === "number" ? review.rating : 0,
      text: review.text?.text?.trim() || "",
      relativeTime: review.relativePublishTimeDescription?.trim() || "",
      mapsUri: reviewShareUrl || review.googleMapsUri?.trim() || mapsUrl,
      author: authorFrom(review.authorAttribution),
      matchedContributor: matched,
    };
    if (matched) {
      matchedReview = item;
      break;
    }
  }

  return {
    placeId,
    placeName,
    placeAddress,
    mapsUrl,
    reviewShareUrl,
    photos: Array.isArray(details.photos) ? details.photos : [],
    matchedReview,
    contributorIdUsed: effectiveSettings.contributorId,
    effectiveSettings,
  };
}

export async function previewGoogleReviewImport(
  mapsInput: string,
  settings: GoogleMapsContributorSettings,
  placeQueryOverride?: string
): Promise<GoogleReviewImportPreview> {
  const ctx = await loadPlaceImportContext(mapsInput, settings, placeQueryOverride);
  const photos: GooglePlacePhotoPreview[] = [];
  const capped = ctx.photos.filter((p) => p.name).slice(0, 12);

  for (const photo of capped) {
    const name = photo.name!;
    const matchedContributor = (photo.authorAttributions ?? []).some((a) =>
      attributionMatches(a, ctx.effectiveSettings)
    );
    // Only keep photos attributed to this Local Guide — never other reviewers' shots.
    if (!matchedContributor) continue;

    const authors = (photo.authorAttributions ?? [])
      .map((a) => authorFrom(a))
      .filter((a): a is GooglePlaceAuthor => Boolean(a));
    let previewUri = "";
    try {
      previewUri = await fetchPhotoPreviewUri(name);
    } catch {
      previewUri = "";
    }
    photos.push({
      name,
      widthPx: photo.widthPx ?? 0,
      heightPx: photo.heightPx ?? 0,
      previewUri,
      authors,
      matchedContributor: true,
    });
  }

  const matchedPhotoCount = photos.length;
  const placePhotoTotal = capped.length;
  let filterNote: string | null = null;
  if (matchedPhotoCount === 0) {
    filterNote = ctx.matchedReview
      ? "Your review text was found, but Google’s Places API didn’t return any photos attributed to your Local Guide id for this place (it only exposes a small place gallery, not your full Maps profile). You can still add the review card, and attach your photos from R2 or your review library."
      : "No photos attributed to your Local Guide id for this place. Google doesn’t expose your full Maps photo history via API — only a small place gallery. Add your shots via R2 once, or import from a place where your photos are on the listing.";
  } else {
    filterNote = `Showing only your photos (${matchedPhotoCount} of ${placePhotoTotal} Google returned for this place). Other reviewers’ images are hidden.`;
  }

  return {
    placeId: ctx.placeId,
    placeName: ctx.placeName,
    placeAddress: ctx.placeAddress,
    mapsUrl: ctx.mapsUrl,
    matchedPhotoCount,
    matchedReview: ctx.matchedReview,
    photos,
    filterNote,
    contributorIdUsed: ctx.contributorIdUsed,
  };
}

export async function importGoogleReviewPhotos(options: {
  mapsInput: string;
  settings: GoogleMapsContributorSettings;
  postId: string;
  photoNames: string[];
  includeReviewCard: boolean;
  useAsCover: boolean;
  placeQueryOverride?: string;
}): Promise<GoogleReviewImportResult> {
  const {
    mapsInput,
    settings,
    postId,
    photoNames,
    includeReviewCard,
    useAsCover,
    placeQueryOverride,
  } = options;
  if (!photoNames.length) {
    if (!includeReviewCard) {
      throw new Error("Select at least one of your photos, or enable the review card.");
    }
    // Review-card-only import (no photos attributed to this Local Guide).
    const ctxOnly = await loadPlaceImportContext(mapsInput, settings, placeQueryOverride);
    if (!ctxOnly.matchedReview && !ctxOnly.placeName) {
      throw new Error("Nothing to import for this place.");
    }
    const googleReview: GoogleReviewCardPayload = {
      enabled: true,
      placeId: ctxOnly.placeId,
      placeName: ctxOnly.placeName,
      placeAddress: ctxOnly.placeAddress,
      rating: ctxOnly.matchedReview?.rating ?? 0,
      reviewText: ctxOnly.matchedReview?.text ?? "",
      relativeTime: ctxOnly.matchedReview?.relativeTime ?? "",
      mapsUrl:
        ctxOnly.reviewShareUrl ||
        ctxOnly.matchedReview?.mapsUri ||
        ctxOnly.mapsUrl,
      ...authorSnapshotFromSettings(settings),
    };
    return {
      galleryImages: [],
      googleReview,
      photoCreditsSuggestion: "",
      coverImageUrl: null,
      libraryMeta: {
        placeId: ctxOnly.placeId,
        placeName: ctxOnly.placeName,
        placeAddress: ctxOnly.placeAddress,
        rating: googleReview.rating,
        reviewText: googleReview.reviewText,
        relativeTime: googleReview.relativeTime,
        mapsUrl: googleReview.mapsUrl,
      },
    };
  }

  const ctx = await loadPlaceImportContext(mapsInput, settings, placeQueryOverride);

  // Only allow photos attributed to this Local Guide.
  const allowedMine = new Set(
    ctx.photos
      .filter(
        (p) =>
          p.name &&
          (p.authorAttributions ?? []).some((a) => attributionMatches(a, ctx.effectiveSettings))
      )
      .map((p) => p.name!)
  );
  const selected = photoNames.filter((name) => allowedMine.has(name));
  if (!selected.length) {
    throw new Error(
      "No photos attributed to your Local Guide id were selected. Google didn’t return your photos for this place — add them from R2 or your review library."
    );
  }

  const safePostId = postId.replace(/[^a-zA-Z0-9_-]+/g, "").slice(0, 64) || "post";
  const safePlace = ctx.placeId.replace(/[^a-zA-Z0-9_-]+/g, "").slice(0, 64);

  const galleryImages: { url: string; alt: string }[] = [];
  for (let i = 0; i < selected.length; i += 1) {
    const name = selected[i]!;
    const { buffer, contentType } = await fetchPhotoBytes(name);
    const ext = extensionForContentType(contentType);
    const key = `site/blog/${safePostId}/google/${safePlace}/${Date.now()}-${i}.${ext}`;
    await putObjectBuffer({
      key,
      body: buffer,
      contentType,
      access: "public-read",
    });
    const url = getPublicR2Url(key);
    galleryImages.push({
      url,
      alt: `${ctx.placeName} — photo ${i + 1}`,
    });
  }

  let googleReview: GoogleReviewCardPayload | null = null;
  if (includeReviewCard) {
    const review = ctx.matchedReview;
    googleReview = {
      enabled: true,
      placeId: ctx.placeId,
      placeName: ctx.placeName,
      placeAddress: ctx.placeAddress,
      rating: review?.rating ?? 0,
      reviewText: review?.text ?? "",
      relativeTime: review?.relativeTime ?? "",
      mapsUrl: ctx.reviewShareUrl || review?.mapsUri || ctx.mapsUrl,
      ...authorSnapshotFromSettings(settings),
    };
  }

  return {
    galleryImages,
    googleReview,
    photoCreditsSuggestion: `Photos also published on Google Maps · ${ctx.placeName}`,
    coverImageUrl: useAsCover && galleryImages[0] ? galleryImages[0].url : null,
    libraryMeta: {
      placeId: ctx.placeId,
      placeName: ctx.placeName,
      placeAddress: ctx.placeAddress,
      rating: ctx.matchedReview?.rating ?? 0,
      reviewText: ctx.matchedReview?.text ?? "",
      relativeTime: ctx.matchedReview?.relativeTime ?? "",
      mapsUrl: ctx.reviewShareUrl || ctx.matchedReview?.mapsUri || ctx.mapsUrl,
    },
  };
}
