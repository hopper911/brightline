import PageBackground from "@/components/PageBackground";
import { getPageBackgroundProps } from "@/lib/page-backgrounds";

/**
 * Renders a page-assigned catalog background when set (wins over site Live).
 * Otherwise falls back to the page’s own media, or nothing (site Live shows through).
 */
export default async function AssignedPageBackground({
  pageKey,
  fallbackMedia,
  fallbackPoster,
  /** When true and nothing is assigned/fallback, still render an empty PageBackground scrim. */
  emptyFallback = false,
}: {
  pageKey: string;
  fallbackMedia?: string | null;
  fallbackPoster?: string | null;
  emptyFallback?: boolean;
}) {
  const assigned = await getPageBackgroundProps(pageKey);
  if (assigned) {
    return (
      <PageBackground
        media={assigned.media}
        poster={assigned.poster}
        forceLocalBackground
      />
    );
  }

  const media = fallbackMedia?.trim() || "";
  if (media) {
    // Entity/page cover media outranks site Live (page assignment → entity → site).
    return (
      <PageBackground
        media={media}
        poster={fallbackPoster ?? undefined}
        forceLocalBackground
      />
    );
  }

  if (emptyFallback) {
    return <PageBackground />;
  }

  return null;
}
