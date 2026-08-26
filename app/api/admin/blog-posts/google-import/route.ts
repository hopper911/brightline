import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  getGoogleMapsContributorSettings,
  normalizeGoogleMapsContributor,
  saveGoogleMapsContributorSettings,
} from "@/lib/google-maps-contributor";
import {
  deleteGoogleReviewLibraryEntry,
  getGoogleReviewLibrary,
  upsertGoogleReviewLibraryEntry,
} from "@/lib/google-review-library";
import {
  importGoogleReviewPhotos,
  previewGoogleReviewImport,
} from "@/lib/google-places-review-import";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Place Details + multiple photo downloads can exceed default serverless time. */
export const maxDuration = 60;

async function rateLimitImport(req: Request): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "google-import", max: 40, windowMs: 60 * 60_000 })) {
    return NextResponse.json(
      { ok: false, error: "Too many Google import requests. Try again later." },
      { status: 429 }
    );
  }
  return null;
}

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const limited = await rateLimitImport(req);
  if (limited) return limited;
  const settings = await getGoogleMapsContributorSettings();
  const library = await getGoogleReviewLibrary();
  const configured = Boolean(
    process.env.GOOGLE_PLACES_API_KEY?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim()
  );
  return NextResponse.json({
    ok: true,
    settings,
    library,
    placesApiConfigured: configured,
  });
}

export async function PATCH(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  const limited = await rateLimitImport(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const settings = await saveGoogleMapsContributorSettings(
    body && typeof body === "object" ? body : {}
  );
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  const limited = await rateLimitImport(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const action = typeof row.action === "string" ? row.action.trim() : "preview";
  const url = typeof row.url === "string" ? row.url.trim() : "";
  const placeQuery =
    typeof row.placeQuery === "string"
      ? row.placeQuery.trim()
      : typeof row.placeName === "string"
        ? row.placeName.trim()
        : "";

  if (
    action !== "library" &&
    action !== "saveEntry" &&
    action !== "deleteEntry" &&
    !url &&
    !placeQuery
  ) {
    return NextResponse.json(
      { ok: false, error: "Paste a Google Maps URL and/or a place name." },
      { status: 400 }
    );
  }

  const stored = await getGoogleMapsContributorSettings();
  const settings = normalizeGoogleMapsContributor({
    contributorId:
      typeof row.contributorId === "string" && row.contributorId.trim()
        ? row.contributorId.trim()
        : stored.contributorId,
    displayNameHint:
      typeof row.displayNameHint === "string" && row.displayNameHint.trim()
        ? row.displayNameHint.trim()
        : stored.displayNameHint,
    avatarUrl:
      typeof row.avatarUrl === "string" ? row.avatarUrl.trim() : stored.avatarUrl,
  });

  if (
    (typeof row.contributorId === "string" && row.contributorId.trim()) ||
    (typeof row.displayNameHint === "string" && row.displayNameHint.trim()) ||
    typeof row.avatarUrl === "string"
  ) {
    try {
      await saveGoogleMapsContributorSettings(settings);
    } catch {
      /* non-fatal */
    }
  }

  try {
    if (action === "deleteEntry") {
      const entryId = typeof row.entryId === "string" ? row.entryId.trim() : "";
      if (!entryId) {
        return NextResponse.json({ ok: false, error: "Missing entryId." }, { status: 400 });
      }
      const library = await deleteGoogleReviewLibraryEntry(entryId);
      return NextResponse.json({ ok: true, library, settings });
    }

    if (action === "saveEntry") {
      const placeName =
        typeof row.placeName === "string"
          ? row.placeName.trim()
          : placeQuery;
      if (!placeName) {
        return NextResponse.json(
          { ok: false, error: "Place name is required to save a review." },
          { status: 400 }
        );
      }
      const photosRaw = Array.isArray(row.photos) ? row.photos : [];
      const photos = photosRaw
        .map((p) => {
          if (!p || typeof p !== "object") return null;
          const photo = p as Record<string, unknown>;
          const photoUrl = typeof photo.url === "string" ? photo.url.trim() : "";
          if (!photoUrl) return null;
          return {
            url: photoUrl,
            alt: typeof photo.alt === "string" ? photo.alt.trim() : placeName,
          };
        })
        .filter((p): p is { url: string; alt: string } => Boolean(p));

      const ratingRaw = typeof row.rating === "number" ? row.rating : Number(row.rating);
      const library = await upsertGoogleReviewLibraryEntry({
        id: typeof row.entryId === "string" ? row.entryId.trim() : undefined,
        placeId: typeof row.placeId === "string" ? row.placeId.trim() : "",
        placeName,
        placeAddress: typeof row.placeAddress === "string" ? row.placeAddress.trim() : "",
        rating: Number.isFinite(ratingRaw) ? ratingRaw : 0,
        reviewText: typeof row.reviewText === "string" ? row.reviewText.trim() : "",
        relativeTime: typeof row.relativeTime === "string" ? row.relativeTime.trim() : "",
        mapsUrl: typeof row.mapsUrl === "string" ? row.mapsUrl.trim() : url,
        photos,
      });
      const mapsUrlSaved =
        typeof row.mapsUrl === "string" ? row.mapsUrl.trim() : url;
      const reviewTextSaved =
        typeof row.reviewText === "string" ? row.reviewText.trim() : "";
      const entry =
        library.entries.find(
          (e) =>
            e.placeName === placeName &&
            (!mapsUrlSaved || e.mapsUrl === mapsUrlSaved) &&
            (!reviewTextSaved || e.reviewText === reviewTextSaved)
        ) || library.entries[0] || null;
      return NextResponse.json({ ok: true, library, settings, entry });
    }

    if (action === "import") {
      const postId = typeof row.postId === "string" ? row.postId.trim() : "";
      if (!postId) {
        return NextResponse.json({ ok: false, error: "Missing postId." }, { status: 400 });
      }
      const photoNames = Array.isArray(row.photoNames)
        ? row.photoNames.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
        : [];
      const mapsInput = url || placeQuery;
      const result = await importGoogleReviewPhotos({
        mapsInput,
        settings,
        postId,
        photoNames,
        includeReviewCard: row.includeReviewCard !== false,
        useAsCover: row.useAsCover === true,
        placeQueryOverride: placeQuery || undefined,
      });

      let library = null;
      try {
        library = await upsertGoogleReviewLibraryEntry({
          ...result.libraryMeta,
          photos: result.galleryImages,
        });
      } catch (err) {
        console.error("GOOGLE_REVIEW_LIBRARY_UPSERT_ERROR", err);
      }

      return NextResponse.json({ ok: true, result, settings, library });
    }

    const mapsInput = url || placeQuery;
    const preview = await previewGoogleReviewImport(
      mapsInput,
      settings,
      placeQuery || undefined
    );
    return NextResponse.json({ ok: true, preview, settings });
  } catch (err: unknown) {
    console.error("GOOGLE_REVIEW_IMPORT_ERROR", err);
    const message = err instanceof Error ? err.message : "Google import failed.";
    const needsPlace = message.startsWith("REVIEW_NEEDS_PLACE:");
    return NextResponse.json(
      {
        ok: false,
        error: needsPlace ? message.replace(/^REVIEW_NEEDS_PLACE:\s*/, "") : message,
        needsPlaceName: needsPlace,
      },
      { status: needsPlace ? 400 : 500 }
    );
  }
}
