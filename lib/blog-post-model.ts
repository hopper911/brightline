/**
 * Client-safe blog post types and pure helpers (no Prisma / Node APIs).
 * Import this from client components instead of `@/lib/blog-posts`.
 */

import {
  migrateLegacyGalleryBlocks,
  type GalleryBlock,
} from "@/lib/gallery-blocks";
import { isTrustedR2Host } from "@/lib/r2";
import { cleanStoryChapters, type StoryChapter } from "@/lib/story-chapters";

export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export type BlogGalleryImage = {
  id: string;
  url: string;
  alt: string;
};

export type BlogBeforeAfterPlacement = "afterCover" | "afterBody" | "afterGallery";

export type BlogBeforeAfter = {
  enabled: boolean;
  beforeImageUrl: string;
  beforeImageAlt: string;
  beforeLabel: string;
  afterImageUrl: string;
  afterImageAlt: string;
  afterLabel: string;
  caption: string;
  placement: BlogBeforeAfterPlacement;
};

/** Fixed case-study template sections — each can be toggled per post. */
export type BlogAiVideoStatus = "idle" | "queued" | "generating" | "ready" | "failed";

export type BlogPostVideoProvider = "youtube" | "instagram" | "r2" | "ai";

export type BlogPostVideo = {
  id: string;
  provider: BlogPostVideoProvider;
  /** YouTube / Instagram URL (empty for r2/ai). */
  url: string;
  /** R2 object key for native MP4 (r2/ai). */
  r2Key: string;
  posterUrl: string;
  caption: string;
};

export type BlogSectionId =
  | "cover"
  | "takeaways"
  | "case"
  | "body"
  | "review"
  | "map"
  | "itinerary"
  | "travelNotes"
  | "videos"
  | "gallery"
  | "credits"
  | "linkedWork";

export const JOURNAL_SECTION_ORDER: BlogSectionId[] = [
  "cover",
  "takeaways",
  "case",
  "body",
  "review",
  "videos",
  "gallery",
  "credits",
  "linkedWork",
];

export const TRAVEL_SECTION_ORDER: BlogSectionId[] = [
  "cover",
  "takeaways",
  "body",
  "review",
  "map",
  "itinerary",
  "travelNotes",
  "videos",
  "gallery",
  "credits",
  "linkedWork",
];

export const BLOG_SECTION_LABELS: Record<BlogSectionId, string> = {
  cover: "Cover image",
  takeaways: "Key takeaways",
  case: "Case study",
  body: "Story body",
  review: "Google review",
  map: "Map",
  itinerary: "Itinerary",
  travelNotes: "Travel notes",
  videos: "Videos",
  gallery: "Gallery",
  credits: "Photo credits",
  linkedWork: "Related work",
};

const BLOG_SECTION_IDS = new Set<BlogSectionId>([
  ...JOURNAL_SECTION_ORDER,
  ...TRAVEL_SECTION_ORDER,
]);

export type BlogCaseStudySections = {
  briefEnabled: boolean;
  brief: string;
  problemEnabled: boolean;
  problem: string;
  solutionEnabled: boolean;
  solution: string;
  galleryEnabled: boolean;
  /** Present gallery as cinematic carousel instead of mosaic grid. */
  galleryCarouselEnabled: boolean;
  videoEnabled: boolean;
  videoUrl: string;
  videoPosterUrl: string;
  videoCaption: string;
  /** Cover/gallery still used as image-to-video input. */
  aiVideoSourceUrl: string;
  /** Motion prompt for fal image-to-video. */
  aiVideoPrompt: string;
  aiVideoStatus: BlogAiVideoStatus;
  aiVideoJobId: string;
  /** R2 object key for generated MP4 under site/blog/… */
  aiVideoKey: string;
  aiVideoError: string;
};

/** Social graphics exported from Canva (R2 keys or URLs). */
export type BlogSocialImages = {
  feedUrl: string;
  storyUrl: string;
};

/** Canva design ids + temporary edit URLs (no secrets). */
export type BlogCanvaDesigns = {
  coverId: string;
  feedId: string;
  storyId: string;
  coverEditUrl: string;
  feedEditUrl: string;
  storyEditUrl: string;
};

/** Social share captions generated for platforms (optional AI drafts). */
export type BlogShareCaptions = {
  instagram: string;
  youtube: string;
  tiktok: string;
};

/** Extra pack assets from batch (clip/crop keys beyond primary). */
export type BlogMediaKitAsset = {
  sourceUrl: string;
  videoKey: string;
  feedUrl: string;
  storyUrl: string;
};

export type BlogPostFormat = "journal" | "travel";

export type BlogTravelItineraryDay = {
  dayLabel: string;
  title: string;
  body: string;
  /** Optional place name for this day (shown on itinerary + can match map stops). */
  place: string;
};

/** Pin on the trip itinerary map. */
export type BlogTravelMapStop = {
  id: string;
  label: string;
  placeName: string;
  dayLabel: string;
  lat: number;
  lng: number;
  note: string;
};

/** Travel-format fields — used when format === "travel". */
export type BlogTravelSections = {
  destination: string;
  region: string;
  datesLabel: string;
  startDate: string;
  endDate: string;
  travelers: string;
  tripStyle: string;
  /** e.g. "Late spring · soft evening light" */
  season: string;
  /** One-line route overview, e.g. "Lisbon → Sintra → Cascais" */
  routeSummary: string;
  highlights: string;
  itinerary: BlogTravelItineraryDay[];
  whereWeStayed: string;
  tips: string;
  packingNotes: string;
  /** Photography gear / approach notes */
  cameraKit: string;
  /** Practical essentials (visas, transit, cash, etc.) */
  essentials: string;
  locationLabel: string;
  mapUrl: string;
  /** Show interactive itinerary map when stops have coordinates. */
  mapEnabled: boolean;
  mapStops: BlogTravelMapStop[];
};

/** Optional card sourced from a Google Maps Local Guide review. */
export type BlogGoogleReview = {
  enabled: boolean;
  placeId: string;
  placeName: string;
  placeAddress: string;
  rating: number;
  reviewText: string;
  relativeTime: string;
  mapsUrl: string;
  /** Snapshot at apply/draft time so the public card doesn’t drift with settings. */
  authorName: string;
  authorAvatarUrl: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  /** Editorial pull quote shown after the excerpt. */
  pullQuote: string;
  /** One takeaway per line. */
  keyTakeaways: string;
  /** Cover / gallery credit line. */
  photoCredits: string;
  coverImageUrl: string;
  coverImageAlt: string;
  galleryImages: BlogGalleryImage[];
  /** Ordered carousel/grid blocks over galleryImages (shared pool). */
  galleryBlocks: GalleryBlock[];
  /** Multi-story chapters; empty = classic body/caseStudy layout. */
  storyChapters: StoryChapter[];
  beforeAfter: BlogBeforeAfter;
  caseStudy: BlogCaseStudySections;
  /** Ordered multi-video list (YouTube / Instagram / R2 / AI). */
  videos: BlogPostVideo[];
  /** Public article section order (missing ids appended from defaults). */
  sectionOrder: BlogSectionId[];
  socialImages: BlogSocialImages;
  canvaDesigns: BlogCanvaDesigns;
  shareCaptions: BlogShareCaptions;
  mediaKitAssets: BlogMediaKitAsset[];
  mediaKitPresetId: string;
  /** Journal vs travel template (missing → journal). */
  format: BlogPostFormat;
  travel: BlogTravelSections;
  /** Google Maps review card (photos still live in galleryImages). */
  googleReview: BlogGoogleReview;
  /** Appear on /blog index when published (default true for journal). */
  showInJournal: boolean;
  /** Appear on /travel index when published (default false for journal). */
  showInTravel: boolean;
  /** Featured strip on homepage when published. */
  featureOnHome: boolean;
  /** Include on /case-studies listing when published. */
  featureInCaseStudies: boolean;
  /** Also publish a copy to Mirotech.solutions /journal (synced on save). */
  publishToMirotech: boolean;
  /** Mirotech JournalPost id after a successful sync (empty until synced). */
  mirotechJournalId: string;
  linkedWorkProjectId: string;
  linkedWorkSlug: string;
  author: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function blankShareCaptions(): BlogShareCaptions {
  return { instagram: "", youtube: "", tiktok: "" };
}

export function cleanShareCaptions(value: unknown): BlogShareCaptions {
  const defaults = blankShareCaptions();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    instagram: cleanString(row.instagram),
    youtube: cleanString(row.youtube),
    tiktok: cleanString(row.tiktok),
  };
}

export function cleanMediaKitAssets(value: unknown): BlogMediaKitAsset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        sourceUrl: cleanString(row.sourceUrl),
        videoKey: cleanString(row.videoKey),
        feedUrl: cleanString(row.feedUrl),
        storyUrl: cleanString(row.storyUrl),
      };
    })
    .filter((item): item is BlogMediaKitAsset => Boolean(item && (item.videoKey || item.feedUrl)))
    .slice(0, 24);
}

export function blankSocialImages(): BlogSocialImages {
  return { feedUrl: "", storyUrl: "" };
}

export function blankCanvaDesigns(): BlogCanvaDesigns {
  return {
    coverId: "",
    feedId: "",
    storyId: "",
    coverEditUrl: "",
    feedEditUrl: "",
    storyEditUrl: "",
  };
}

export function cleanSocialImages(value: unknown): BlogSocialImages {
  const defaults = blankSocialImages();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    feedUrl: cleanString(row.feedUrl),
    storyUrl: cleanString(row.storyUrl),
  };
}

export function cleanCanvaDesigns(value: unknown): BlogCanvaDesigns {
  const defaults = blankCanvaDesigns();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    coverId: cleanString(row.coverId),
    feedId: cleanString(row.feedId),
    storyId: cleanString(row.storyId),
    coverEditUrl: cleanString(row.coverEditUrl),
    feedEditUrl: cleanString(row.feedEditUrl),
    storyEditUrl: cleanString(row.storyEditUrl),
  };
}

export function slugifyBlog(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function newId() {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanGalleryImages(value: unknown): BlogGalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = cleanString(row.url);
      if (!url) return null;
      const id = cleanString(row.id) || newId();
      return {
        id,
        url,
        alt: cleanString(row.alt),
      };
    })
    .filter((item): item is BlogGalleryImage => Boolean(item))
    .slice(0, 120);
}

const BEFORE_AFTER_PLACEMENTS = new Set<BlogBeforeAfterPlacement>([
  "afterCover",
  "afterBody",
  "afterGallery",
]);

export function blankBeforeAfter(): BlogBeforeAfter {
  return {
    enabled: false,
    beforeImageUrl: "",
    beforeImageAlt: "",
    beforeLabel: "Before",
    afterImageUrl: "",
    afterImageAlt: "",
    afterLabel: "After",
    caption: "",
    placement: "afterBody",
  };
}

export function cleanBeforeAfter(value: unknown): BlogBeforeAfter {
  const defaults = blankBeforeAfter();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const placementRaw = cleanString(row.placement) as BlogBeforeAfterPlacement;
  return {
    enabled: row.enabled === true,
    beforeImageUrl: cleanString(row.beforeImageUrl),
    beforeImageAlt: cleanString(row.beforeImageAlt),
    beforeLabel: cleanString(row.beforeLabel) || defaults.beforeLabel,
    afterImageUrl: cleanString(row.afterImageUrl),
    afterImageAlt: cleanString(row.afterImageAlt),
    afterLabel: cleanString(row.afterLabel) || defaults.afterLabel,
    caption: cleanString(row.caption),
    placement: BEFORE_AFTER_PLACEMENTS.has(placementRaw) ? placementRaw : defaults.placement,
  };
}

export function hasBeforeAfter(section: BlogBeforeAfter | null | undefined): boolean {
  if (!section?.enabled) return false;
  return Boolean(section.beforeImageUrl.trim() && section.afterImageUrl.trim());
}

export function blankCaseStudy(): BlogCaseStudySections {
  return {
    briefEnabled: false,
    brief: "",
    problemEnabled: false,
    problem: "",
    solutionEnabled: false,
    solution: "",
    galleryEnabled: true,
    galleryCarouselEnabled: false,
    videoEnabled: false,
    videoUrl: "",
    videoPosterUrl: "",
    videoCaption: "",
    aiVideoSourceUrl: "",
    aiVideoPrompt: "",
    aiVideoStatus: "idle",
    aiVideoJobId: "",
    aiVideoKey: "",
    aiVideoError: "",
  };
}

const AI_VIDEO_STATUSES = new Set<BlogAiVideoStatus>([
  "idle",
  "queued",
  "generating",
  "ready",
  "failed",
]);

export function cleanCaseStudy(value: unknown): BlogCaseStudySections {
  const defaults = blankCaseStudy();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const statusRaw = cleanString(row.aiVideoStatus) as BlogAiVideoStatus;
  return {
    briefEnabled: row.briefEnabled === true,
    brief: cleanString(row.brief),
    problemEnabled: row.problemEnabled === true,
    problem: cleanString(row.problem),
    solutionEnabled: row.solutionEnabled === true,
    solution: cleanString(row.solution),
    // Default gallery on for older posts that already have images
    galleryEnabled: row.galleryEnabled !== false,
    galleryCarouselEnabled: row.galleryCarouselEnabled === true,
    videoEnabled: row.videoEnabled === true,
    videoUrl: cleanString(row.videoUrl),
    videoPosterUrl: cleanString(row.videoPosterUrl),
    videoCaption: cleanString(row.videoCaption),
    aiVideoSourceUrl: cleanString(row.aiVideoSourceUrl),
    aiVideoPrompt: cleanString(row.aiVideoPrompt),
    aiVideoStatus: AI_VIDEO_STATUSES.has(statusRaw) ? statusRaw : defaults.aiVideoStatus,
    aiVideoJobId: cleanString(row.aiVideoJobId),
    aiVideoKey: cleanString(row.aiVideoKey),
    aiVideoError: cleanString(row.aiVideoError),
  };
}

/** Extract a YouTube video id from a watch/share/embed URL or bare id. */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (match?.[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Normalize an Instagram Reel/post/IGTV permalink.
 * Only allows instagram.com / www.instagram.com hosts.
 */
export function extractInstagramPermalink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (host !== "instagram.com" && host !== "www.instagram.com") return null;

  const match = url.pathname.match(/^\/(reels?|p|tv)\/([A-Za-z0-9_-]+)\/?/i);
  if (!match?.[1] || !match[2]) return null;

  const kindRaw = match[1].toLowerCase();
  const kind = kindRaw === "reels" ? "reel" : kindRaw;
  const code = match[2];
  return `https://www.instagram.com/${kind}/${code}/`;
}

/** Official Instagram embed iframe URL (plays in-frame when allowed). */
export function instagramEmbedUrl(permalinkInput: string): string | null {
  const permalink = extractInstagramPermalink(permalinkInput);
  if (!permalink) return null;
  return `${permalink}embed/`;
}

export type BlogCaseStudyVideoProvider = "ai" | "instagram" | "youtube";

function newVideoId() {
  return `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankBlogPostVideo(
  partial?: Partial<BlogPostVideo> & { provider?: BlogPostVideoProvider }
): BlogPostVideo {
  return {
    id: partial?.id || newVideoId(),
    provider: partial?.provider || "youtube",
    url: partial?.url || "",
    r2Key: partial?.r2Key || "",
    posterUrl: partial?.posterUrl || "",
    caption: partial?.caption || "",
  };
}

export function detectBlogVideoProviderFromUrl(
  input: string
): Extract<BlogPostVideoProvider, "youtube" | "instagram"> | null {
  if (extractInstagramPermalink(input)) return "instagram";
  if (extractYouTubeId(input)) return "youtube";
  return null;
}

/**
 * Allowlist video posters: R2 keys, site-relative paths, Brightline/R2 hosts,
 * /api/media/public, and YouTube thumb hosts. Rejects arbitrary external URLs.
 */
export function cleanVideoPosterUrl(raw: unknown): string {
  const value = cleanString(raw).slice(0, 2048);
  if (!value) return "";
  if (value.includes("\0") || value.includes("\\")) return "";

  // Site-relative path (not protocol-relative).
  if (value.startsWith("/") && !value.startsWith("//")) {
    if (value.includes("..")) return "";
    return value;
  }

  // Raw object key (no scheme).
  if (!/^https?:\/\//i.test(value)) {
    if (value.includes("..") || value.includes("://")) return "";
    return value.replace(/^\/+/, "");
  }

  try {
    const u = new URL(value);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const host = u.hostname.toLowerCase();

    if (isTrustedR2Host(host)) return value;

    if (
      host === "brightlinephotography.com" ||
      host.endsWith(".brightlinephotography.com") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return value;
    }

    if (
      u.pathname.replace(/\/$/, "") === "/api/media/public" &&
      u.searchParams.get("key")?.trim()
    ) {
      const key = decodeURIComponent(u.searchParams.get("key")!.trim());
      if (!key || key.includes("..")) return "";
      return value;
    }

    // YouTube stills used as posters.
    if (host === "i.ytimg.com" || host === "img.youtube.com") return value;

    return "";
  } catch {
    return "";
  }
}

export function cleanBlogPostVideo(value: unknown): BlogPostVideo | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const providerRaw = cleanString(row.provider) as BlogPostVideoProvider;
  const provider: BlogPostVideoProvider =
    providerRaw === "instagram" ||
    providerRaw === "r2" ||
    providerRaw === "ai" ||
    providerRaw === "youtube"
      ? providerRaw
      : "youtube";
  const url = cleanString(row.url);
  const r2Key = cleanString(row.r2Key);
  const posterUrl = cleanVideoPosterUrl(row.posterUrl);
  const caption = cleanString(row.caption).slice(0, 500);
  const id = cleanString(row.id) || newVideoId();

  if (provider === "youtube") {
    const yt = extractYouTubeId(url);
    if (!yt) return null;
    return { id, provider, url, r2Key: "", posterUrl, caption };
  }
  if (provider === "instagram") {
    const ig = extractInstagramPermalink(url);
    if (!ig) return null;
    return { id, provider, url: ig, r2Key: "", posterUrl, caption };
  }
  if (!r2Key) return null;
  return { id, provider, url: "", r2Key, posterUrl, caption };
}

export function cleanBlogPostVideos(value: unknown): BlogPostVideo[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanBlogPostVideo(item))
    .filter((item): item is BlogPostVideo => Boolean(item))
    .slice(0, 12);
}

/** Migrate legacy single caseStudy video fields into videos[] when empty. */
export function migrateLegacyCaseStudyVideos(
  caseStudy: BlogCaseStudySections,
  existing: unknown
): BlogPostVideo[] {
  const cleaned = cleanBlogPostVideos(existing);
  if (cleaned.length > 0) return cleaned;

  const out: BlogPostVideo[] = [];
  if (caseStudy.aiVideoStatus === "ready" && caseStudy.aiVideoKey.trim()) {
    out.push(
      blankBlogPostVideo({
        provider: "ai",
        r2Key: caseStudy.aiVideoKey,
        posterUrl: caseStudy.videoPosterUrl || caseStudy.aiVideoSourceUrl,
        caption: caseStudy.videoCaption,
      })
    );
  }
  if (caseStudy.videoEnabled && caseStudy.videoUrl.trim()) {
    const ig = extractInstagramPermalink(caseStudy.videoUrl);
    const yt = extractYouTubeId(caseStudy.videoUrl);
    if (ig) {
      out.push(
        blankBlogPostVideo({
          provider: "instagram",
          url: ig,
          posterUrl: caseStudy.videoPosterUrl,
          caption: caseStudy.videoCaption,
        })
      );
    } else if (yt) {
      out.push(
        blankBlogPostVideo({
          provider: "youtube",
          url: caseStudy.videoUrl.trim(),
          posterUrl: caseStudy.videoPosterUrl,
          caption: caseStudy.videoCaption,
        })
      );
    }
  }
  return out.slice(0, 12);
}

export function isRenderableBlogVideo(video: BlogPostVideo): boolean {
  if (video.provider === "youtube") return Boolean(extractYouTubeId(video.url));
  if (video.provider === "instagram") return Boolean(extractInstagramPermalink(video.url));
  return Boolean(video.r2Key.trim());
}

export function hasBlogVideos(videos: BlogPostVideo[] | null | undefined): boolean {
  return (videos ?? []).some(isRenderableBlogVideo);
}

export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function defaultSectionOrder(format: BlogPostFormat): BlogSectionId[] {
  return format === "travel" ? [...TRAVEL_SECTION_ORDER] : [...JOURNAL_SECTION_ORDER];
}

export function cleanSectionOrder(
  value: unknown,
  format: BlogPostFormat
): BlogSectionId[] {
  const defaults = defaultSectionOrder(format);
  const allowed = new Set(defaults);
  const seen = new Set<BlogSectionId>();
  const ordered: BlogSectionId[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      const id = cleanString(item) as BlogSectionId;
      if (!BLOG_SECTION_IDS.has(id) || !allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
  }

  for (const id of defaults) {
    if (!seen.has(id)) ordered.push(id);
  }
  return ordered;
}

export function resolveSectionOrder(post: Pick<BlogPost, "format" | "sectionOrder">): BlogSectionId[] {
  return cleanSectionOrder(post.sectionOrder, post.format);
}

/** Precedence helper for legacy single-slot caseStudy video. */
export function getCaseStudyVideoProvider(
  cs: BlogCaseStudySections
): BlogCaseStudyVideoProvider | null {
  if (!cs.videoEnabled) return null;
  if (cs.aiVideoStatus === "ready" && Boolean(cs.aiVideoKey.trim())) return "ai";
  if (extractInstagramPermalink(cs.videoUrl)) return "instagram";
  if (extractYouTubeId(cs.videoUrl)) return "youtube";
  return null;
}

export function hasCaseStudyBrief(cs: BlogCaseStudySections): boolean {
  return cs.briefEnabled && Boolean(cs.brief.trim());
}

export function hasCaseStudyProblem(cs: BlogCaseStudySections): boolean {
  return cs.problemEnabled && Boolean(cs.problem.trim());
}

export function hasCaseStudySolution(cs: BlogCaseStudySections): boolean {
  return cs.solutionEnabled && Boolean(cs.solution.trim());
}

export function hasCaseStudyVideo(cs: BlogCaseStudySections): boolean {
  return getCaseStudyVideoProvider(cs) !== null;
}

export function hasCaseStudyAiVideo(cs: BlogCaseStudySections): boolean {
  return cs.videoEnabled && cs.aiVideoStatus === "ready" && Boolean(cs.aiVideoKey.trim());
}

export function blankTravel(): BlogTravelSections {
  return {
    destination: "",
    region: "",
    datesLabel: "",
    startDate: "",
    endDate: "",
    travelers: "",
    tripStyle: "",
    season: "",
    routeSummary: "",
    highlights: "",
    itinerary: [],
    whereWeStayed: "",
    tips: "",
    packingNotes: "",
    cameraKit: "",
    essentials: "",
    locationLabel: "",
    mapUrl: "",
    mapEnabled: true,
    mapStops: [],
  };
}

function cleanLatLng(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function cleanTravelMapStops(value: unknown): BlogTravelMapStop[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const lat = cleanLatLng(row.lat);
      const lng = cleanLatLng(row.lng);
      if (lat == null || lng == null) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
      const label = cleanString(row.label) || cleanString(row.placeName) || `Stop ${index + 1}`;
      return {
        id: cleanString(row.id) || `stop_${index}_${Math.round(lat * 1000)}_${Math.round(lng * 1000)}`,
        label: label.slice(0, 80),
        placeName: cleanString(row.placeName).slice(0, 120),
        dayLabel: cleanString(row.dayLabel).slice(0, 40),
        lat,
        lng,
        note: cleanString(row.note).slice(0, 400),
      };
    })
    .filter((item): item is BlogTravelMapStop => Boolean(item))
    .slice(0, 24);
}

export function cleanTravel(value: unknown): BlogTravelSections {
  const defaults = blankTravel();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const itinerary = Array.isArray(row.itinerary)
    ? row.itinerary
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const day = item as Record<string, unknown>;
          const dayLabel = cleanString(day.dayLabel);
          const title = cleanString(day.title);
          const body = cleanString(day.body);
          const place = cleanString(day.place);
          if (!dayLabel && !title && !body && !place) return null;
          return { dayLabel, title, body, place };
        })
        .filter((item): item is BlogTravelItineraryDay => Boolean(item))
        .slice(0, 14)
    : [];
  return {
    destination: cleanString(row.destination),
    region: cleanString(row.region),
    datesLabel: cleanString(row.datesLabel),
    startDate: cleanString(row.startDate),
    endDate: cleanString(row.endDate),
    travelers: cleanString(row.travelers),
    tripStyle: cleanString(row.tripStyle),
    season: cleanString(row.season),
    routeSummary: cleanString(row.routeSummary),
    highlights: cleanString(row.highlights),
    itinerary,
    whereWeStayed: cleanString(row.whereWeStayed),
    tips: cleanString(row.tips),
    packingNotes: cleanString(row.packingNotes),
    cameraKit: cleanString(row.cameraKit),
    essentials: cleanString(row.essentials),
    locationLabel: cleanString(row.locationLabel),
    mapUrl: (() => {
      const raw = cleanString(row.mapUrl);
      if (!raw) return "";
      // Prefer iframe src if an embed snippet was pasted into the field.
      const srcMatch = raw.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (srcMatch?.[1]) return srcMatch[1].trim();
      return raw;
    })(),
    mapEnabled: row.mapEnabled !== false,
    mapStops: cleanTravelMapStops(row.mapStops),
  };
}

export function hasTravelMap(travel: BlogTravelSections | null | undefined): boolean {
  if (!travel?.mapEnabled) return false;
  const hasStops = (travel.mapStops ?? []).some(
    (s) =>
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng) &&
      !(s.lat === 0 && s.lng === 0) &&
      s.lat >= -90 &&
      s.lat <= 90 &&
      s.lng >= -180 &&
      s.lng <= 180
  );
  if (hasStops) return true;
  // Google Maps embed / share URL alone still shows a map on the post.
  const url = (travel.mapUrl || "").trim();
  if (!url) return false;
  return (
    url.includes("google.com/maps") ||
    url.includes("maps.google.com") ||
    url.includes("maps.app.goo.gl") ||
    url.includes("output=embed") ||
    url.includes("/maps/embed")
  );
}

/** True when we have pin coordinates for the Leaflet route map. */
export function hasTravelMapStops(travel: BlogTravelSections | null | undefined): boolean {
  if (!travel?.mapEnabled) return false;
  return (travel.mapStops ?? []).some(
    (s) =>
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng) &&
      !(s.lat === 0 && s.lng === 0) &&
      s.lat >= -90 &&
      s.lat <= 90 &&
      s.lng >= -180 &&
      s.lng <= 180
  );
}

export function cleanBlogPostFormat(value: unknown): BlogPostFormat {
  return value === "travel" ? "travel" : "journal";
}

export function isTravelPost(post: Pick<BlogPost, "format">): boolean {
  return post.format === "travel";
}

export function blankGoogleReview(): BlogGoogleReview {
  return {
    enabled: false,
    placeId: "",
    placeName: "",
    placeAddress: "",
    rating: 0,
    reviewText: "",
    relativeTime: "",
    mapsUrl: "",
    authorName: "",
    authorAvatarUrl: "",
  };
}

export function cleanGoogleReview(value: unknown): BlogGoogleReview {
  const defaults = blankGoogleReview();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const ratingRaw = typeof row.rating === "number" ? row.rating : Number(row.rating);
  const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(0, ratingRaw)) : 0;
  return {
    enabled: row.enabled === true,
    placeId: cleanString(row.placeId),
    placeName: cleanString(row.placeName),
    placeAddress: cleanString(row.placeAddress),
    rating,
    reviewText: cleanString(row.reviewText),
    relativeTime: cleanString(row.relativeTime),
    mapsUrl: cleanString(row.mapsUrl),
    authorName: cleanString(row.authorName),
    authorAvatarUrl: cleanString(row.authorAvatarUrl),
  };
}

export function hasGoogleReview(review: BlogGoogleReview | null | undefined): boolean {
  if (!review?.enabled) return false;
  return Boolean(review.placeName.trim() || review.reviewText.trim() || review.mapsUrl.trim());
}

export function blankBlogPost(title = "Untitled post"): BlogPost {
  const now = new Date().toISOString();
  const slug = slugifyBlog(title) || "untitled-post";
  return {
    id: newId(),
    slug,
    title,
    excerpt: "",
    body: "",
    pullQuote: "",
    keyTakeaways: "",
    photoCredits: "",
    coverImageUrl: "",
    coverImageAlt: "",
    galleryImages: [],
    galleryBlocks: [],
    storyChapters: [],
    beforeAfter: blankBeforeAfter(),
    caseStudy: blankCaseStudy(),
    videos: [],
    sectionOrder: [...JOURNAL_SECTION_ORDER],
    socialImages: blankSocialImages(),
    canvaDesigns: blankCanvaDesigns(),
    shareCaptions: blankShareCaptions(),
    mediaKitAssets: [],
    mediaKitPresetId: "editorial",
    format: "journal",
    travel: blankTravel(),
    googleReview: blankGoogleReview(),
    showInJournal: true,
    showInTravel: false,
    featureOnHome: false,
    featureInCaseStudies: false,
    publishToMirotech: false,
    mirotechJournalId: "",
    linkedWorkProjectId: "",
    linkedWorkSlug: "",
    author: "BRIGHTLINE",
    tags: [],
    seoTitle: "",
    seoDescription: "",
    status: "DRAFT",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Pre-filled draft for Travel section posts. */
export function blankTravelPost(title = "New travel post"): BlogPost {
  return {
    ...blankBlogPost(title),
    format: "travel",
    mediaKitPresetId: "travel",
    showInJournal: false,
    showInTravel: true,
    sectionOrder: [...TRAVEL_SECTION_ORDER],
  };
}

export function normalizeBlogPost(input: unknown): BlogPost | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const title = cleanString(row.title) || "Untitled post";
  const slug = slugifyBlog(cleanString(row.slug) || title);
  if (!slug) return null;

  const status = row.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const createdAt =
    typeof row.createdAt === "string" && row.createdAt.trim()
      ? row.createdAt.trim()
      : new Date().toISOString();
  const publishedAt =
    typeof row.publishedAt === "string" && row.publishedAt.trim() ? row.publishedAt.trim() : null;

  const format = cleanBlogPostFormat(row.format);
  const galleryImages = cleanGalleryImages(row.galleryImages);
  const caseStudy = cleanCaseStudy(row.caseStudy);
  const videos = migrateLegacyCaseStudyVideos(caseStudy, row.videos);
  const sectionOrder = cleanSectionOrder(row.sectionOrder, format);
  const galleryBlocks = migrateLegacyGalleryBlocks({
    existingBlocks: row.galleryBlocks,
    carouselEnabled: caseStudy.galleryCarouselEnabled,
    hasImages: galleryImages.length > 0,
    galleryEnabled: caseStudy.galleryEnabled,
  });

  return {
    id: cleanString(row.id) || newId(),
    slug,
    title,
    excerpt: cleanString(row.excerpt),
    body: cleanString(row.body),
    pullQuote: cleanString(row.pullQuote),
    keyTakeaways: cleanString(row.keyTakeaways),
    photoCredits: cleanString(row.photoCredits),
    coverImageUrl: cleanString(row.coverImageUrl),
    coverImageAlt: cleanString(row.coverImageAlt),
    galleryImages,
    galleryBlocks,
    storyChapters: cleanStoryChapters(row.storyChapters),
    beforeAfter: cleanBeforeAfter(row.beforeAfter),
    caseStudy,
    videos,
    sectionOrder,
    socialImages: cleanSocialImages(row.socialImages),
    canvaDesigns: cleanCanvaDesigns(row.canvaDesigns),
    shareCaptions: cleanShareCaptions(row.shareCaptions),
    mediaKitAssets: cleanMediaKitAssets(row.mediaKitAssets),
    mediaKitPresetId: cleanString(row.mediaKitPresetId) || (format === "travel" ? "travel" : "editorial"),
    format,
    travel: cleanTravel(row.travel),
    googleReview: cleanGoogleReview(row.googleReview),
    // Default true for older journal posts (field missing)
    showInJournal: row.showInJournal !== false,
    // Travel index: travel posts default on; journal posts default off
    showInTravel:
      format === "travel" ? row.showInTravel !== false : row.showInTravel === true,
    featureOnHome: row.featureOnHome === true,
    featureInCaseStudies: row.featureInCaseStudies === true,
    publishToMirotech: row.publishToMirotech === true,
    mirotechJournalId: cleanString(row.mirotechJournalId),
    linkedWorkProjectId: cleanString(row.linkedWorkProjectId),
    linkedWorkSlug: cleanString(row.linkedWorkSlug),
    author: cleanString(row.author) || "BRIGHTLINE",
    tags: cleanTags(row.tags),
    seoTitle: cleanString(row.seoTitle),
    seoDescription: cleanString(row.seoDescription),
    status,
    publishedAt: status === "PUBLISHED" ? publishedAt ?? createdAt : publishedAt,
    createdAt,
    updatedAt:
      typeof row.updatedAt === "string" && row.updatedAt.trim() ? row.updatedAt.trim() : createdAt,
  };
}

/** Dedupe by slug — keep first, rename later collisions instead of dropping posts. */
export function normalizePosts(input: unknown): BlogPost[] {
  if (!Array.isArray(input)) return [];
  const seen = new Map<string, number>();
  const posts: BlogPost[] = [];

  for (const item of input) {
    const post = normalizeBlogPost(item);
    if (!post) continue;

    let slug = post.slug;
    const count = seen.get(slug) ?? 0;
    if (count > 0) {
      slug = `${post.slug}-${count + 1}`;
      let n = count + 1;
      while (seen.has(slug)) {
        n += 1;
        slug = `${post.slug}-${n}`;
      }
    }
    seen.set(post.slug, count + 1);
    seen.set(slug, 1);
    posts.push(slug === post.slug ? post : { ...post, slug });
  }

  return posts.sort((a, b) => {
    const aTime = Date.parse(a.publishedAt ?? a.updatedAt);
    const bTime = Date.parse(b.publishedAt ?? b.updatedAt);
    return bTime - aTime;
  });
}

export function formatBlogDate(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
