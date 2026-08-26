/**
 * Sync Brightline journal posts to Mirotech JournalPost (server-to-server).
 * Auth: CONTENT_API_SECRET or MIROTECH_ADMIN_HANDOFF_SECRET (same as handoff).
 */

import type { BlogPost } from "@/lib/blog-post-model";
import {
  hasBeforeAfter,
  hasCaseStudyBrief,
  hasCaseStudyProblem,
  hasCaseStudySolution,
  hasGoogleReview,
  isRenderableBlogVideo,
} from "@/lib/blog-post-model";
import { mirotechSiteOrigin } from "@/lib/mirotech-admin-handoff";

function syncBearer(): string | null {
  const candidates = [
    process.env.CONTENT_API_SECRET?.trim(),
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET?.trim(),
    process.env.ADMIN_HANDOFF_SECRET?.trim(),
  ].filter((v): v is string => Boolean(v && v.length >= 16));
  return candidates[0] ?? null;
}

export function isMirotechJournalSyncConfigured(): boolean {
  return Boolean(syncBearer());
}

export type MirotechJournalSyncResult = {
  postId: string;
  ok: boolean;
  mirotechJournalId?: string;
  error?: string;
};

function resolveMediaUrlForMirotech(stored: string | null | undefined): string | null {
  const raw = stored?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://brightlinephotography.com";
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/api/media/public?key=${encodeURIComponent(raw.replace(/^\/+/, ""))}`;
}

function buildArticlePayload(post: BlogPost) {
  const cs = post.caseStudy;
  const caseStudy = {
    brief: hasCaseStudyBrief(cs) ? cs.brief.trim() : "",
    problem: hasCaseStudyProblem(cs) ? cs.problem.trim() : "",
    solution: hasCaseStudySolution(cs) ? cs.solution.trim() : "",
  };
  const hasCase =
    Boolean(caseStudy.brief) || Boolean(caseStudy.problem) || Boolean(caseStudy.solution);

  const galleryImages = (post.galleryImages || [])
    .map((img) => {
      const url = resolveMediaUrlForMirotech(img.url);
      if (!url) return null;
      return { id: img.id, url, alt: (img.alt || "").trim() || undefined };
    })
    .filter(Boolean) as Array<{ id?: string; url: string; alt?: string }>;

  const byId = new Map(
    galleryImages.filter((g) => g.id).map((g) => [g.id as string, g.url] as const)
  );

  const galleryBlocks = (post.galleryBlocks || [])
    .map((block) => {
      const urls =
        block.itemIds?.length > 0
          ? block.itemIds.map((id) => byId.get(id)).filter((u): u is string => Boolean(u))
          : galleryImages.map((g) => g.url);
      return {
        id: block.id,
        layout: block.type,
        imageIds: block.itemIds?.length ? block.itemIds : undefined,
        urls: urls.length ? urls : undefined,
      };
    })
    .filter((b) => (b.urls && b.urls.length > 0) || (b.imageIds && b.imageIds.length > 0));

  const gr = post.googleReview;
  const googleReview =
    hasGoogleReview(gr)
      ? {
          enabled: true,
          placeId: gr.placeId?.trim() || undefined,
          placeName: gr.placeName?.trim() || undefined,
          placeAddress: gr.placeAddress?.trim() || undefined,
          rating: typeof gr.rating === "number" ? gr.rating : undefined,
          reviewText: gr.reviewText?.trim() || undefined,
          relativeTime: gr.relativeTime?.trim() || undefined,
          mapsUrl: gr.mapsUrl?.trim() || undefined,
          authorName: gr.authorName?.trim() || undefined,
          authorAvatarUrl:
            resolveMediaUrlForMirotech(gr.authorAvatarUrl) ||
            resolveMediaUrlForMirotech("/brand/brightline-bl-monogram.png") ||
            undefined,
        }
      : undefined;

  const travelRaw = post.travel;
  const mapStops = (travelRaw?.mapStops || [])
    .filter(
      (s) =>
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lng) &&
        !(s.lat === 0 && s.lng === 0)
    )
    .map((s) => ({
      id: s.id,
      label: (s.label || s.placeName || "").trim() || "Stop",
      placeName: (s.placeName || "").trim() || undefined,
      dayLabel: (s.dayLabel || "").trim() || undefined,
      lat: s.lat,
      lng: s.lng,
      note: (s.note || "").trim() || undefined,
    }));

  const itinerary = (travelRaw?.itinerary || [])
    .map((d) => ({
      dayLabel: (d.dayLabel || "").trim() || undefined,
      title: (d.title || "").trim() || undefined,
      body: (d.body || "").trim() || undefined,
      place: (d.place || "").trim() || undefined,
    }))
    .filter((d) => d.dayLabel || d.title || d.body || d.place);

  const travel =
    travelRaw &&
    (travelRaw.destination?.trim() ||
      travelRaw.routeSummary?.trim() ||
      travelRaw.highlights?.trim() ||
      travelRaw.mapUrl?.trim() ||
      mapStops.length ||
      itinerary.length ||
      travelRaw.whereWeStayed?.trim() ||
      travelRaw.tips?.trim() ||
      travelRaw.packingNotes?.trim() ||
      travelRaw.cameraKit?.trim() ||
      travelRaw.essentials?.trim())
      ? {
          destination: travelRaw.destination?.trim() || undefined,
          region: travelRaw.region?.trim() || undefined,
          datesLabel: travelRaw.datesLabel?.trim() || undefined,
          routeSummary: travelRaw.routeSummary?.trim() || undefined,
          highlights: travelRaw.highlights?.trim() || undefined,
          itinerary: itinerary.length ? itinerary : undefined,
          whereWeStayed: travelRaw.whereWeStayed?.trim() || undefined,
          tips: travelRaw.tips?.trim() || undefined,
          packingNotes: travelRaw.packingNotes?.trim() || undefined,
          cameraKit: travelRaw.cameraKit?.trim() || undefined,
          essentials: travelRaw.essentials?.trim() || undefined,
          locationLabel: travelRaw.locationLabel?.trim() || undefined,
          mapUrl: travelRaw.mapUrl?.trim() || undefined,
          mapEnabled: travelRaw.mapEnabled !== false,
          mapStops: mapStops.length ? mapStops : undefined,
        }
      : undefined;

  const videos = (post.videos || [])
    .filter(isRenderableBlogVideo)
    .map((v) => {
      const src =
        v.provider === "r2" || v.provider === "ai"
          ? resolveMediaUrlForMirotech(v.r2Key)
          : undefined;
      return {
        id: v.id,
        provider: v.provider,
        url: (v.url || "").trim() || undefined,
        src: src || undefined,
        posterUrl: resolveMediaUrlForMirotech(v.posterUrl) || undefined,
        caption: (v.caption || "").trim() || undefined,
      };
    })
    .filter((v) => v.url || v.src);

  const ba = post.beforeAfter;
  const beforeAfter =
    hasBeforeAfter(ba)
      ? {
          enabled: true,
          beforeImageUrl: resolveMediaUrlForMirotech(ba.beforeImageUrl) || undefined,
          afterImageUrl: resolveMediaUrlForMirotech(ba.afterImageUrl) || undefined,
          beforeImageAlt: ba.beforeImageAlt?.trim() || undefined,
          afterImageAlt: ba.afterImageAlt?.trim() || undefined,
          beforeLabel: ba.beforeLabel?.trim() || undefined,
          afterLabel: ba.afterLabel?.trim() || undefined,
          caption: ba.caption?.trim() || undefined,
          placement: ba.placement,
        }
      : undefined;

  const linkedWork = post.linkedWorkSlug?.trim()
    ? { slug: post.linkedWorkSlug.trim(), title: undefined as string | undefined }
    : undefined;

  return {
    pullQuote: (post.pullQuote || "").trim() || undefined,
    keyTakeaways: (post.keyTakeaways || "").trim() || undefined,
    coverImageAlt: (post.coverImageAlt || "").trim() || undefined,
    photoCredits: (post.photoCredits || "").trim() || undefined,
    caseStudy: hasCase ? caseStudy : undefined,
    galleryImages: galleryImages.length
      ? galleryImages.map(({ url, alt }) => ({ url, alt }))
      : undefined,
    galleryBlocks: galleryBlocks.length ? galleryBlocks : undefined,
    sectionOrder: Array.isArray(post.sectionOrder) ? post.sectionOrder : undefined,
    googleReview,
    travel,
    videos: videos.length ? videos : undefined,
    beforeAfter:
      beforeAfter?.beforeImageUrl && beforeAfter?.afterImageUrl ? beforeAfter : undefined,
    linkedWork,
  };
}

export async function syncBlogPostToMirotech(
  post: BlogPost
): Promise<MirotechJournalSyncResult> {
  const bearer = syncBearer();
  if (!bearer) {
    return {
      postId: post.id,
      ok: false,
      error: "Mirotech sync secret not configured (CONTENT_API_SECRET or MIROTECH_ADMIN_HANDOFF_SECRET).",
    };
  }

  const wantLive = post.publishToMirotech === true;
  const action = wantLive ? "upsert" : "unpublish";
  const cover = resolveMediaUrlForMirotech(post.coverImageUrl);
  const articlePayload = buildArticlePayload(post);

  try {
    const res = await fetch(`${mirotechSiteOrigin()}/api/content/v1/journal/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        brightlinePostId: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        heroImage: cover,
        backgroundMedia: cover,
        author: post.author || "Kiril Mironyuk",
        tags: post.tags,
        categories: post.format === "travel" ? ["Travel"] : ["Journal"],
        status: post.status === "PUBLISHED" && wantLive ? "PUBLISHED" : "DRAFT",
        seoTitle: post.seoTitle || null,
        seoDescription: post.seoDescription || null,
        canonicalUrl: null,
        featured: post.featureOnHome === true,
        mirotechJournalId: post.mirotechJournalId || null,
        pullQuote: articlePayload.pullQuote,
        keyTakeaways: articlePayload.keyTakeaways,
        coverImageAlt: articlePayload.coverImageAlt,
        photoCredits: articlePayload.photoCredits,
        caseStudy: articlePayload.caseStudy,
        galleryImages: articlePayload.galleryImages,
        galleryBlocks: articlePayload.galleryBlocks,
        sectionOrder: articlePayload.sectionOrder,
        googleReview: articlePayload.googleReview,
        travel: articlePayload.travel,
        videos: articlePayload.videos,
        beforeAfter: articlePayload.beforeAfter,
        linkedWork: articlePayload.linkedWork,
        articlePayload,
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      journalId?: string;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      return {
        postId: post.id,
        ok: false,
        error: data.error || `Mirotech sync failed (${res.status})`,
      };
    }

    return {
      postId: post.id,
      ok: true,
      mirotechJournalId: data.journalId || post.mirotechJournalId || "",
    };
  } catch (e) {
    return {
      postId: post.id,
      ok: false,
      error: e instanceof Error ? e.message : "Mirotech sync failed",
    };
  }
}

/**
 * Sync posts that opt into Mirotech (or previously had a Mirotech id and need unpublish).
 * Returns posts with updated mirotechJournalId fields.
 */
export async function syncBlogPostsToMirotech(posts: BlogPost[]): Promise<{
  posts: BlogPost[];
  results: MirotechJournalSyncResult[];
}> {
  const results: MirotechJournalSyncResult[] = [];
  const next = posts.map((p) => ({ ...p }));

  await Promise.all(
    next.map(async (post, index) => {
      const shouldSync = post.publishToMirotech || Boolean(post.mirotechJournalId);
      if (!shouldSync) return;
      const result = await syncBlogPostToMirotech(post);
      results.push(result);
      if (result.ok) {
        next[index] = {
          ...post,
          mirotechJournalId: post.publishToMirotech
            ? result.mirotechJournalId || post.mirotechJournalId || ""
            : "",
        };
      }
    })
  );

  return { posts: next, results };
}
