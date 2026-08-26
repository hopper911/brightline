import { prisma } from "@/lib/prisma";

export const GOOGLE_REVIEW_LIBRARY_SETTING_KEY = "google_review_library:v1";

export type GoogleReviewLibraryPhoto = {
  id: string;
  url: string;
  alt: string;
};

export type GoogleReviewLibraryEntry = {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
  /** Prefer the review share URL when available. */
  mapsUrl: string;
  photos: GoogleReviewLibraryPhoto[];
  updatedAt: string;
};

export type GoogleReviewLibrary = {
  entries: GoogleReviewLibraryEntry[];
};

function newEntryId() {
  return `grev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newPhotoId() {
  return `gph_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function blankGoogleReviewLibrary(): GoogleReviewLibrary {
  return { entries: [] };
}

export function normalizeGoogleReviewLibrary(input: unknown): GoogleReviewLibrary {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rawEntries = Array.isArray(row.entries) ? row.entries : [];
  const entries: GoogleReviewLibraryEntry[] = [];

  for (const item of rawEntries) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const placeId = cleanString(e.placeId);
    const placeName = cleanString(e.placeName);
    if (!placeId && !placeName) continue;
    const photosRaw = Array.isArray(e.photos) ? e.photos : [];
    const photos: GoogleReviewLibraryPhoto[] = [];
    const seen = new Set<string>();
    for (const p of photosRaw) {
      if (!p || typeof p !== "object") continue;
      const photo = p as Record<string, unknown>;
      const url = cleanString(photo.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      photos.push({
        id: cleanString(photo.id) || newPhotoId(),
        url,
        alt: cleanString(photo.alt) || placeName || "Google review photo",
      });
    }
    const ratingRaw = typeof e.rating === "number" ? e.rating : Number(e.rating);
    entries.push({
      id: cleanString(e.id) || newEntryId(),
      placeId,
      placeName: placeName || "Untitled place",
      placeAddress: cleanString(e.placeAddress),
      rating: Number.isFinite(ratingRaw) ? Math.min(5, Math.max(0, ratingRaw)) : 0,
      reviewText: cleanString(e.reviewText),
      relativeTime: cleanString(e.relativeTime),
      mapsUrl: cleanString(e.mapsUrl),
      photos,
      updatedAt:
        typeof e.updatedAt === "string" && e.updatedAt.trim()
          ? e.updatedAt.trim()
          : new Date().toISOString(),
    });
  }

  entries.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return { entries };
}

export async function getGoogleReviewLibrary(): Promise<GoogleReviewLibrary> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: GOOGLE_REVIEW_LIBRARY_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return blankGoogleReviewLibrary();
    return normalizeGoogleReviewLibrary(JSON.parse(setting.value));
  } catch {
    return blankGoogleReviewLibrary();
  }
}

export async function saveGoogleReviewLibrary(input: unknown): Promise<GoogleReviewLibrary> {
  const library = normalizeGoogleReviewLibrary(input);
  await prisma.siteSetting.upsert({
    where: { key: GOOGLE_REVIEW_LIBRARY_SETTING_KEY },
    update: { value: JSON.stringify(library) },
    create: { key: GOOGLE_REVIEW_LIBRARY_SETTING_KEY, value: JSON.stringify(library) },
  });
  return library;
}

/** Merge imported place photos into the durable library (dedupe by photo URL). */
export async function upsertGoogleReviewLibraryEntry(input: {
  id?: string;
  placeId: string;
  placeName: string;
  placeAddress?: string;
  rating?: number;
  reviewText?: string;
  relativeTime?: string;
  mapsUrl?: string;
  photos: { url: string; alt: string }[];
}): Promise<GoogleReviewLibrary> {
  const library = await getGoogleReviewLibrary();
  const placeId = input.placeId.trim();
  const placeName = input.placeName.trim() || "Untitled place";
  const mapsUrl = input.mapsUrl?.trim() || "";
  const now = new Date().toISOString();

  const existingIdx = library.entries.findIndex((e) => {
    if (input.id && e.id === input.id) return true;
    if (placeId && e.placeId === placeId) return true;
    if (mapsUrl && e.mapsUrl && e.mapsUrl === mapsUrl) return true;
    if (!placeId && e.placeName.toLowerCase() === placeName.toLowerCase()) return true;
    return false;
  });

  const incomingPhotos = input.photos
    .map((p) => ({
      id: newPhotoId(),
      url: p.url.trim(),
      alt: p.alt.trim() || placeName,
    }))
    .filter((p) => p.url);

  if (existingIdx >= 0) {
    const current = library.entries[existingIdx]!;
    const seen = new Set(current.photos.map((p) => p.url));
    const mergedPhotos = [...current.photos];
    for (const photo of incomingPhotos) {
      if (seen.has(photo.url)) continue;
      seen.add(photo.url);
      mergedPhotos.push(photo);
    }
    library.entries[existingIdx] = {
      ...current,
      placeId: placeId || current.placeId,
      placeName,
      placeAddress: input.placeAddress?.trim() || current.placeAddress,
      rating:
        typeof input.rating === "number" && input.rating > 0 ? input.rating : current.rating,
      reviewText: input.reviewText?.trim() || current.reviewText,
      relativeTime: input.relativeTime?.trim() || current.relativeTime,
      mapsUrl: mapsUrl || current.mapsUrl,
      photos: mergedPhotos,
      updatedAt: now,
    };
  } else {
    library.entries.unshift({
      id: input.id?.trim() || newEntryId(),
      placeId,
      placeName,
      placeAddress: input.placeAddress?.trim() || "",
      rating: typeof input.rating === "number" ? input.rating : 0,
      reviewText: input.reviewText?.trim() || "",
      relativeTime: input.relativeTime?.trim() || "",
      mapsUrl,
      photos: incomingPhotos,
      updatedAt: now,
    });
  }

  return saveGoogleReviewLibrary(library);
}

export async function deleteGoogleReviewLibraryEntry(entryId: string): Promise<GoogleReviewLibrary> {
  const library = await getGoogleReviewLibrary();
  const id = entryId.trim();
  if (!id) return library;
  return saveGoogleReviewLibrary({
    entries: library.entries.filter((e) => e.id !== id),
  });
}
