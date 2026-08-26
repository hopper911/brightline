import type { BlogGoogleReview } from "@/lib/blog-post-model";
import { hasGoogleReview } from "@/lib/blog-post-model";
import { DEFAULT_GOOGLE_REVIEW_AVATAR } from "@/lib/google-maps-contributor";

function starsLabel(rating: number) {
  const n = Math.round(Math.min(5, Math.max(0, rating)));
  if (n <= 0) return null;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function GoogleReviewCard({ review }: { review: BlogGoogleReview }) {
  if (!hasGoogleReview(review)) return null;

  const stars = starsLabel(review.rating);
  const mapsHref = review.mapsUrl.trim();
  const authorName = review.authorName.trim() || "Kiril";
  const avatarSrc = review.authorAvatarUrl.trim() || DEFAULT_GOOGLE_REVIEW_AVATAR;
  const roleLabel = review.placeName.trim()
    ? `Local Guide · ${review.placeName.trim()}`
    : "Local Guide";

  return (
    <aside className="rounded-2xl border border-white/10 bg-black/40 p-6 sm:p-8">
      <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
        Google review
      </p>

      {review.reviewText ? (
        <blockquote className="mt-5 text-base leading-relaxed text-white/82 sm:text-[1.05rem]">
          “{review.reviewText}”
        </blockquote>
      ) : review.placeName ? (
        <p className="mt-5 font-display text-2xl leading-snug text-white">{review.placeName}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-black/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-white">{authorName}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">{roleLabel}</p>
          {stars ? (
            <p
              className="mt-2 text-sm tracking-[0.14em] text-amber-100/90"
              aria-label={`${review.rating} out of 5`}
            >
              {stars}
              {review.relativeTime ? (
                <span className="ml-3 text-xs tracking-normal text-white/40">
                  {review.relativeTime}
                </span>
              ) : null}
            </p>
          ) : review.relativeTime ? (
            <p className="mt-2 text-xs text-white/40">{review.relativeTime}</p>
          ) : null}
        </div>
      </div>

      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block text-xs uppercase tracking-[0.28em] text-white/55 hover:text-white"
        >
          View on Google Maps →
        </a>
      ) : null}
    </aside>
  );
}
