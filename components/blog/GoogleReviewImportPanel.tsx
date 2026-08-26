"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogGalleryImage, BlogGoogleReview, BlogPost } from "@/lib/blog-post-model";
import { blankGoogleReview, blankTravelPost } from "@/lib/blog-post-model";
import {
  DEFAULT_GOOGLE_REVIEW_AVATAR,
  type GoogleMapsContributorSettings,
} from "@/lib/google-maps-contributor";
import type { GoogleReviewLibrary, GoogleReviewLibraryEntry } from "@/lib/google-review-library";
import { parseGoogleReviewPaste } from "@/lib/parse-google-review-paste";

type Props = {
  post: BlogPost;
  contributorReviewsUrl?: string;
  onApply: (patch: {
    galleryImages?: BlogGalleryImage[];
    googleReview?: BlogGoogleReview;
    photoCredits?: string;
    coverImageUrl?: string;
    coverImageAlt?: string;
  }) => void;
  onUpdateReview: (review: BlogGoogleReview) => void;
  onCreateDraft: (draft: BlogPost) => void;
  onRequestLibraryPhotos: (onPicked: (urls: string[]) => void) => void;
};

function newGalleryImageId() {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function starsLabel(rating: number) {
  const n = Math.round(Math.min(5, Math.max(0, rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function authorSnapshot(settings: {
  displayNameHint: string;
  avatarUrl: string;
}): Pick<BlogGoogleReview, "authorName" | "authorAvatarUrl"> {
  return {
    authorName: settings.displayNameHint.trim() || "Kiril",
    authorAvatarUrl: settings.avatarUrl.trim() || DEFAULT_GOOGLE_REVIEW_AVATAR,
  };
}

function reviewPayloadFromEntry(
  entry: GoogleReviewLibraryEntry,
  settings: { displayNameHint: string; avatarUrl: string }
): BlogGoogleReview {
  return {
    enabled: true,
    placeId: entry.placeId,
    placeName: entry.placeName,
    placeAddress: entry.placeAddress,
    rating: entry.rating,
    reviewText: entry.reviewText,
    relativeTime: entry.relativeTime,
    mapsUrl: entry.mapsUrl,
    ...authorSnapshot(settings),
  };
}

function draftFromReview(
  entry: GoogleReviewLibraryEntry,
  settings: { displayNameHint: string; avatarUrl: string }
): BlogPost {
  const title = entry.placeName.trim() || "Dining notes";
  const draft = blankTravelPost(title);
  const photos: BlogGalleryImage[] = entry.photos.map((photo) => ({
    id: newGalleryImageId(),
    url: photo.url,
    alt: photo.alt || entry.placeName,
  }));
  return {
    ...draft,
    excerpt: entry.reviewText
      ? entry.reviewText.slice(0, 180) + (entry.reviewText.length > 180 ? "…" : "")
      : `Dining notes from ${entry.placeName}.`,
    body: "",
    coverImageUrl: photos[0]?.url || "",
    coverImageAlt: photos[0]?.alt || entry.placeName,
    galleryImages: photos,
    photoCredits: entry.mapsUrl
      ? `Photos also published on Google Maps · ${entry.placeName}`
      : "",
    googleReview: reviewPayloadFromEntry(entry, settings),
    travel: {
      ...draft.travel,
      destination: entry.placeName,
      locationLabel: entry.placeAddress || entry.placeName,
      mapUrl: entry.mapsUrl,
      highlights: "",
    },
    tags: ["google-review", "dining", "travel"],
  };
}

export default function GoogleReviewImportPanel({
  post,
  contributorReviewsUrl = "https://www.google.com/maps/contrib/109203527785619718155/reviews",
  onApply,
  onUpdateReview,
  onCreateDraft,
  onRequestLibraryPhotos,
}: Props) {
  const [contributorId, setContributorId] = useState("");
  const [displayNameHint, setDisplayNameHint] = useState("Kiril");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [library, setLibrary] = useState<GoogleReviewLibrary>({ entries: [] });
  const [libraryView, setLibraryView] = useState<"reviews" | "allPhotos">("reviews");
  const [librarySelected, setLibrarySelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"load" | "save" | "draft" | "settings" | "screenshot" | null>(
    null
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [relativeTime, setRelativeTime] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [photos, setPhotos] = useState<{ url: string; alt: string }[]>([]);
  const [rawPaste, setRawPaste] = useState("");

  const authorSettings = useMemo(
    () => ({ displayNameHint, avatarUrl }),
    [displayNameHint, avatarUrl]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBusy("load");
      try {
        const res = await fetch("/api/admin/blog-posts/google-import", { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to load review library.");
          return;
        }
        const settings = data.settings as GoogleMapsContributorSettings | undefined;
        setContributorId(settings?.contributorId ?? "");
        setDisplayNameHint(settings?.displayNameHint ?? "Kiril");
        setAvatarUrl(settings?.avatarUrl ?? "");
        if (data.library?.entries) setLibrary(data.library);
      } catch {
        if (!cancelled) setError("Failed to load review library.");
      } finally {
        if (!cancelled) setBusy(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const allLibraryPhotos = useMemo(() => {
    return library.entries.flatMap((entry) =>
      entry.photos.map((photo) => ({
        ...photo,
        placeName: entry.placeName,
        entryId: entry.id,
      }))
    );
  }, [library.entries]);

  async function saveAuthorSettings(next?: {
    displayNameHint?: string;
    avatarUrl?: string;
    contributorId?: string;
  }) {
    setBusy("settings");
    setError("");
    try {
      const res = await fetch("/api/admin/blog-posts/google-import", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributorId: next?.contributorId ?? contributorId,
          displayNameHint: next?.displayNameHint ?? displayNameHint,
          avatarUrl: next?.avatarUrl ?? avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save settings.");
      const settings = data.settings as GoogleMapsContributorSettings;
      setContributorId(settings.contributorId);
      setDisplayNameHint(settings.displayNameHint);
      setAvatarUrl(settings.avatarUrl);
      setStatus("Testimonial author settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setBusy(null);
    }
  }

  function applyPasteParse() {
    const parsed = parseGoogleReviewPaste(rawPaste || reviewText);
    if (parsed.rating != null) setRating(parsed.rating);
    if (parsed.relativeTime) setRelativeTime(parsed.relativeTime);
    if (parsed.reviewText) setReviewText(parsed.reviewText);
    setStatus("Parsed rating / time / text from paste. Check fields, then add photos.");
    setError("");
  }

  function resetForm() {
    setPlaceName("");
    setAddress("");
    setRating(5);
    setReviewText("");
    setRelativeTime("");
    setMapsUrl("");
    setPhotos([]);
    setRawPaste("");
  }

  async function saveEntryToLibrary(): Promise<GoogleReviewLibraryEntry | null> {
    if (!placeName.trim()) {
      setError("Place name is required.");
      return null;
    }
    if (!reviewText.trim() && photos.length === 0) {
      setError("Add review text and/or photos.");
      return null;
    }

    const res = await fetch("/api/admin/blog-posts/google-import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveEntry",
        placeName: placeName.trim(),
        placeAddress: address.trim(),
        rating,
        reviewText: reviewText.trim(),
        relativeTime: relativeTime.trim(),
        mapsUrl: mapsUrl.trim(),
        photos,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save review.");
    setLibrary(data.library);
    if (data.entry) return data.entry as GoogleReviewLibraryEntry;
    const entries = (data.library?.entries ?? []) as GoogleReviewLibraryEntry[];
    return entries[0] || null;
  }

  async function saveOnly() {
    setBusy("save");
    setError("");
    try {
      const entry = await saveEntryToLibrary();
      if (!entry) return;
      resetForm();
      setLibraryView("reviews");
      setStatus("Saved to My reviews. Create a draft whenever you’re ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAndCreateDraft() {
    setBusy("draft");
    setError("");
    try {
      const entry = await saveEntryToLibrary();
      if (!entry) return;
      onCreateDraft(draftFromReview(entry, authorSettings));
      resetForm();
      setLibraryView("reviews");
      setStatus("Draft created — write your dining story in the body. Review card is at the end.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create draft.");
    } finally {
      setBusy(null);
    }
  }

  async function fillFromScreenshot() {
    setError("");
    setStatus("");
    onRequestLibraryPhotos((urls) => {
      const imageUrl = urls[0]?.trim();
      if (!imageUrl) return;
      void (async () => {
        setBusy("screenshot");
        try {
          const res = await fetch("/api/admin/blog-posts/google-import/parse-screenshot", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.error || "Screenshot parse failed.");
          const parsed = data.parsed as {
            placeName?: string;
            placeAddress?: string;
            rating?: number;
            reviewText?: string;
            relativeTime?: string;
          };
          if (parsed.placeName) setPlaceName(parsed.placeName);
          if (parsed.placeAddress) setAddress(parsed.placeAddress);
          if (parsed.rating) setRating(parsed.rating);
          if (parsed.reviewText) setReviewText(parsed.reviewText);
          if (parsed.relativeTime) setRelativeTime(parsed.relativeTime);
          setStatus(
            "Filled from screenshot. Attach your food photos from R2, then Save & create draft."
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Screenshot parse failed.");
        } finally {
          setBusy(null);
        }
      })();
    });
  }

  async function deleteEntry(entryId: string) {
    if (!confirm("Remove this review from My reviews?")) return;
    setBusy("save");
    try {
      const res = await fetch("/api/admin/blog-posts/google-import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteEntry", entryId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to delete.");
      setLibrary(data.library);
      setStatus("Review removed from My reviews.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setBusy(null);
    }
  }

  function applyEntryToPost(entry: GoogleReviewLibraryEntry) {
    const added: BlogGalleryImage[] = entry.photos.map((image) => ({
      id: newGalleryImageId(),
      url: image.url,
      alt: image.alt,
    }));
    onApply({
      ...(added.length ? { galleryImages: added } : {}),
      googleReview: reviewPayloadFromEntry(entry, authorSettings),
      ...(added[0] ? { coverImageUrl: added[0].url, coverImageAlt: added[0].alt } : {}),
      ...(entry.mapsUrl && !post.photoCredits.trim()
        ? { photoCredits: `Photos also published on Google Maps · ${entry.placeName}` }
        : {}),
    });
    setStatus(`Applied “${entry.placeName}” — gallery set to this review’s photos.`);
    setError("");
  }

  function applySelectedLibraryPhotos() {
    const selectedPhotos = allLibraryPhotos.filter((p) => librarySelected.has(p.url));
    if (!selectedPhotos.length) {
      setError("Select photos in your library first.");
      return;
    }
    const added: BlogGalleryImage[] = selectedPhotos.map((image) => ({
      id: newGalleryImageId(),
      url: image.url,
      alt: image.alt || image.placeName,
    }));
    const firstEntry = library.entries.find((e) => e.id === selectedPhotos[0]?.entryId);
    onApply({
      galleryImages: [...post.galleryImages, ...added],
      ...(firstEntry ? { googleReview: reviewPayloadFromEntry(firstEntry, authorSettings) } : {}),
    });
    setLibrarySelected(new Set());
    setStatus(`Added ${added.length} photo(s) from your library to this post.`);
    setError("");
  }

  const review = post.googleReview ?? blankGoogleReview();
  const avatarPreview = avatarUrl.trim() || DEFAULT_GOOGLE_REVIEW_AVATAR;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/75">Repost a Google review</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Google cannot send your Local Guide reviews or photos to apps. Open the review on
              Maps → Share (copy link) → copy the review text → attach food photos from R2 →{" "}
              <span className="text-white/75">Save &amp; create draft</span>.
            </p>
          </div>
          <a
            href={contributorReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost text-xs"
          >
            Open my Maps reviews →
          </a>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <label className="block text-xs text-white/55">
              Testimonial name
              <input
                value={displayNameHint}
                onChange={(e) => setDisplayNameHint(e.target.value)}
                onBlur={() => void saveAuthorSettings()}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  onRequestLibraryPhotos((urls) => {
                    const next = urls[0]?.trim() || "";
                    if (!next) return;
                    setAvatarUrl(next);
                    void saveAuthorSettings({ avatarUrl: next });
                  })
                }
              >
                Set avatar from R2
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  onClick={() => {
                    setAvatarUrl("");
                    void saveAuthorSettings({ avatarUrl: "" });
                  }}
                >
                  Use monogram
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/35 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy !== null}
              onClick={() => fillFromScreenshot()}
            >
              {busy === "screenshot" ? "Reading screenshot…" : "Fill from screenshot (R2)"}
            </button>
          </div>

          <label className="block text-xs text-white/55">
            Paste full review (optional helper)
            <textarea
              value={rawPaste}
              onChange={(e) => setRawPaste(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="Paste stars + “4 days ago” + review body from Maps, then Parse"
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={!rawPaste.trim() && !reviewText.trim()}
            onClick={applyPasteParse}
          >
            Parse paste into fields
          </button>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/55">
              Place name
              <input
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                placeholder="Twin Tails"
              />
            </label>
            <label className="block text-xs text-white/55">
              Rating
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {starsLabel(n)} ({n})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs text-white/55">
            Address (optional)
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="10 Columbus Cir…"
            />
          </label>

          <label className="block text-xs text-white/55">
            Maps share link
            <input
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
              placeholder="https://maps.app.goo.gl/…"
            />
          </label>

          <label className="block text-xs text-white/55">
            Relative time (optional)
            <input
              value={relativeTime}
              onChange={(e) => setRelativeTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="4 days ago"
            />
          </label>

          <label className="block text-xs text-white/55">
            Your review text
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              placeholder="Paste the review you wrote on Google Maps…"
            />
          </label>

          <div>
            <p className="text-xs leading-relaxed text-amber-200/75">
              Google will not send your review photos here. Upload them to R2 once (camera roll /
              downloads), then multi-select below.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-xs text-white/55">Photos ({photos.length})</p>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() =>
                  onRequestLibraryPhotos((urls) => {
                    setPhotos((current) => {
                      const seen = new Set(current.map((p) => p.url));
                      const next = [...current];
                      for (const photoUrl of urls) {
                        if (seen.has(photoUrl)) continue;
                        seen.add(photoUrl);
                        next.push({
                          url: photoUrl,
                          alt: placeName || "Review photo",
                        });
                      }
                      return next;
                    });
                  })
                }
              >
                Add from R2
              </button>
            </div>
            {photos.length > 0 ? (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {photos.map((photo) => (
                  <div
                    key={photo.url}
                    className="relative aspect-square overflow-hidden rounded-lg border border-white/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[0.55rem] text-white"
                      onClick={() =>
                        setPhotos((current) => current.filter((p) => p.url !== photo.url))
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary text-xs"
              disabled={busy !== null}
              onClick={() => void saveAndCreateDraft()}
            >
              {busy === "draft" ? "Creating…" : "Save & create blog draft"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy !== null}
              onClick={() => void saveOnly()}
            >
              {busy === "save" ? "Saving…" : "Save to My reviews only"}
            </button>
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-red-300/90">{error}</p> : null}
        {status ? <p className="mt-3 text-xs text-white/55">{status}</p> : null}

        {review?.placeName || review?.enabled ? (
          <div className="mt-5 border-t border-white/10 pt-4">
            <label className="inline-flex items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={review.enabled === true}
                onChange={(e) => onUpdateReview({ ...review, enabled: e.target.checked })}
              />
              Review testimonial enabled on published post
            </label>
            {review.placeName ? (
              <p className="mt-2 text-xs text-white/45">Linked place: {review.placeName}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn text-xs ${libraryView === "reviews" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLibraryView("reviews")}
          >
            My reviews ({library.entries.length})
          </button>
          <button
            type="button"
            className={`btn text-xs ${libraryView === "allPhotos" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLibraryView("allPhotos")}
          >
            All photos ({allLibraryPhotos.length})
          </button>
        </div>

        {libraryView === "reviews" ? (
          library.entries.length === 0 ? (
            <p className="mt-4 text-xs text-white/40">
              No reviews saved yet. Use the form above for your first one.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {library.entries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/85">{entry.placeName}</p>
                      {entry.placeAddress ? (
                        <p className="mt-1 text-xs text-white/45">{entry.placeAddress}</p>
                      ) : null}
                      {entry.rating ? (
                        <p className="mt-1 text-xs text-amber-100/85">{starsLabel(entry.rating)}</p>
                      ) : null}
                      {entry.reviewText ? (
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/65">
                          {entry.reviewText}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-white/40">No review text saved yet.</p>
                      )}
                      <p className="mt-2 text-[0.65rem] uppercase tracking-[0.16em] text-white/40">
                        {entry.photos.length} photo{entry.photos.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="btn btn-primary text-xs"
                        onClick={() => onCreateDraft(draftFromReview(entry, authorSettings))}
                      >
                        Create blog draft
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost text-xs"
                        onClick={() => applyEntryToPost(entry)}
                      >
                        Apply to this post
                      </button>
                      {entry.mapsUrl ? (
                        <a
                          href={entry.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost text-xs text-center"
                        >
                          Open on Maps
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-ghost text-xs text-red-300/80"
                        onClick={() => void deleteEntry(entry.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {entry.photos.length > 0 ? (
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {entry.photos.map((photo) => (
                        <div
                          key={photo.id}
                          className="aspect-square overflow-hidden rounded-lg border border-white/10"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt={photo.alt}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : allLibraryPhotos.length === 0 ? (
          <p className="mt-4 text-xs text-white/40">No photos in the library yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => setLibrarySelected(new Set(allLibraryPhotos.map((p) => p.url)))}
              >
                Select all ({allLibraryPhotos.length})
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                disabled={librarySelected.size === 0}
                onClick={applySelectedLibraryPhotos}
              >
                Add {librarySelected.size || ""} to this post
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {allLibraryPhotos.map((photo) => {
                const on = librarySelected.has(photo.url);
                return (
                  <button
                    key={`${photo.entryId}-${photo.id}`}
                    type="button"
                    title={photo.placeName}
                    onClick={() =>
                      setLibrarySelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(photo.url)) next.delete(photo.url);
                        else next.add(photo.url);
                        return next;
                      })
                    }
                    className={`relative aspect-square overflow-hidden rounded-lg border ${
                      on ? "border-white/60 ring-1 ring-white/30" : "border-white/10"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.alt}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-white/80">
                      {photo.placeName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
