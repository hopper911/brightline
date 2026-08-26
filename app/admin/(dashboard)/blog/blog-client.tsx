"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type {
  BlogPost,
  BlogPostStatus,
  BlogPostFormat,
  BlogGalleryImage,
  BlogBeforeAfter,
  BlogBeforeAfterPlacement,
  BlogCaseStudySections,
  BlogTravelSections,
} from "@/lib/blog-post-model";
import BeforeAfterSlider from "@/components/blog/BeforeAfterSlider";
import BlogSharePanel from "@/components/blog/BlogSharePanel";
import BlogCanvaPanel from "@/components/blog/BlogCanvaPanel";
import BlogMediaKitPanel from "@/components/blog/BlogMediaKitPanel";
import BlogDistributionPanel from "@/components/blog/BlogDistributionPanel";
import BlogTravelPanel from "@/components/blog/BlogTravelPanel";
import BlogVideosEditor from "@/components/blog/BlogVideosEditor";
import BlogSectionOrderEditor from "@/components/blog/BlogSectionOrderEditor";
import GoogleReviewImportPanel from "@/components/blog/GoogleReviewImportPanel";
import GalleryBlocksEditor from "@/components/admin/GalleryBlocksEditor";
import StoryChaptersEditor from "@/components/admin/StoryChaptersEditor";
import type { BlogAssistAction, BlogSuggestResult, BlogFormatResult } from "@/lib/ai/generateBlogPostAssist";
import { isImportedJournalSlug } from "@/lib/blog-imported";
import { fetchVisionAltText, mapWithConcurrency } from "@/lib/blog-image-alt";
import type { HubSharedBlogEntry } from "@/lib/dual-brand/studio-hub";
import { getPublicR2Url } from "@/lib/r2";
import { blankGalleryBlock } from "@/lib/gallery-blocks";
import { blogPostToChapter } from "@/lib/story-chapters";
import {
  blankBeforeAfter,
  blankBlogPost,
  blankTravelPost,
  blankCaseStudy,
  blankTravel,
  defaultSectionOrder,
  formatBlogDate,
  slugifyBlog,
} from "@/lib/blog-post-model";
import R2BrowserModal from "../work/R2BrowserModal";

function newGalleryImageId() {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white";
const MONO_INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white";

function AiRegenerateButton({
  loading,
  disabled,
  onClick,
}: {
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-violet-200 transition hover:border-violet-400/45 hover:bg-violet-400/15 disabled:opacity-40"
    >
      {loading ? "…" : "✦ AI"}
    </button>
  );
}

function EditorField({
  label,
  hint,
  children,
  onRegenerate,
  aiLoading,
  aiDisabled,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  onRegenerate?: () => void;
  aiLoading?: boolean;
  aiDisabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/70">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-white/45">{hint}</p> : null}
        </div>
        {onRegenerate ? (
          <AiRegenerateButton loading={aiLoading} disabled={aiDisabled} onClick={onRegenerate} />
        ) : null}
      </div>
      {children}
    </div>
  );
}

function tagsToString(tags: string[]) {
  return tags.join(", ");
}

function tagsFromString(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function statusBadge(status: BlogPostStatus) {
  return status === "PUBLISHED"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export default function BlogAdminClient({
  initialPosts,
  sharedHubBlogs = [],
}: {
  initialPosts: BlogPost[];
  sharedHubBlogs?: HubSharedBlogEntry[];
}) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [selectedId, setSelectedId] = useState(initialPosts[0]?.id ?? "");
  const [selectedSharedId, setSelectedSharedId] = useState<string | null>(
    initialPosts.length === 0 && sharedHubBlogs[0] ? sharedHubBlogs[0].journalId : null
  );
  const [selectionMode, setSelectionMode] = useState<"local" | "shared">(
    initialPosts.length > 0 ? "local" : sharedHubBlogs.length > 0 ? "shared" : "local"
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState("");
  const [suggestions, setSuggestions] = useState<BlogSuggestResult | null>(null);
  const [r2Target, setR2Target] = useState<
    "cover" | "gallery" | "before" | "after" | "videoPoster" | "googleReviewLibrary" | null
  >(null);
  const googleReviewPhotoPickerRef = useRef<((urls: string[]) => void) | null>(null);
  const [altScanning, setAltScanning] = useState<{
    type: "cover" | "gallery" | "before" | "after";
    done: number;
    total: number;
  } | null>(null);
  const [aiVideoBusy, setAiVideoBusy] = useState(false);
  const [aiVideoMessage, setAiVideoMessage] = useState("");
  const [formatFilter, setFormatFilter] = useState<"all" | BlogPostFormat | "shared">("all");
  const [travelAiDayIndex, setTravelAiDayIndex] = useState<number | null>(null);

  const selected = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? posts[0],
    [posts, selectedId]
  );

  const selectedShared = useMemo(
    () => sharedHubBlogs.find((e) => e.journalId === selectedSharedId) ?? null,
    [sharedHubBlogs, selectedSharedId]
  );

  const viewingShared = selectionMode === "shared" && Boolean(selectedShared);

  const filteredPosts = useMemo(() => {
    if (formatFilter === "shared") return [];
    if (formatFilter === "all") return posts;
    return posts.filter((p) => (p.format || "journal") === formatFilter);
  }, [posts, formatFilter]);

  const filteredShared = useMemo(() => {
    if (formatFilter === "journal" || formatFilter === "travel") return [];
    return sharedHubBlogs;
  }, [sharedHubBlogs, formatFilter]);

  const draftCount = posts.filter((p) => p.status === "DRAFT").length;
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;
  const travelCount = posts.filter((p) => p.format === "travel").length;
  const sharedCount = sharedHubBlogs.length;

  function setDirty() {
    setSaveStatus("idle");
  }

  function updateSelected(patch: Partial<BlogPost>) {
    if (!selected) return;
    const selectedId = selected.id;
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== selectedId) return post;
        const next: BlogPost = {
          ...post,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
        // Merge travel fields so async map builds can't wipe itinerary/days with a stale snapshot.
        if (patch.travel) {
          const travelPatch = Object.fromEntries(
            Object.entries(patch.travel).filter(([, v]) => v !== undefined)
          ) as Partial<BlogTravelSections>;
          next.travel = {
            ...(post.travel ?? blankTravel()),
            ...travelPatch,
          };
        }
        return next;
      })
    );
    setDirty();
  }

  function addPost() {
    const post = blankBlogPost("New blog post");
    setPosts((current) => [post, ...current]);
    setSelectedId(post.id);
    setSuggestions(null);
    setDirty();
  }

  function addTravelPost() {
    const post = blankTravelPost("New travel post");
    setPosts((current) => [post, ...current]);
    setSelectedId(post.id);
    setFormatFilter("travel");
    setSuggestions(null);
    setDirty();
  }

  function setPostFormat(format: BlogPostFormat) {
    if (!selected) return;
    if (format === "travel") {
      updateSelected({
        format: "travel",
        showInJournal: false,
        showInTravel: true,
        sectionOrder: defaultSectionOrder("travel"),
        mediaKitPresetId:
          selected.mediaKitPresetId === "editorial" || !selected.mediaKitPresetId
            ? "travel"
            : selected.mediaKitPresetId,
        travel: selected.travel ?? blankTravel(),
      });
    } else {
      updateSelected({
        format: "journal",
        showInTravel: false,
        showInJournal: selected.showInJournal !== false,
        sectionOrder: defaultSectionOrder("journal"),
        mediaKitPresetId:
          selected.mediaKitPresetId === "travel" ? "editorial" : selected.mediaKitPresetId,
      });
    }
  }

  function deletePost() {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}"? This cannot be undone until you save.`)) return;
    const next = posts.filter((post) => post.id !== selected.id);
    setPosts(next);
    setSelectedId(next[0]?.id ?? "");
    setSuggestions(null);
    setDirty();
  }

  function setStatus(nextStatus: BlogPostStatus) {
    if (!selected) return;
    updateSelected({
      status: nextStatus,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? selected.publishedAt ?? new Date().toISOString()
          : selected.publishedAt,
    });
  }

  async function save() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/blog-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ posts }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        posts?: BlogPost[];
        error?: string;
        mirotechSync?: Array<{ postId: string; ok: boolean; error?: string }>;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      setPosts(json.posts ?? posts);
      const syncFail = (json.mirotechSync || []).filter((r) => !r.ok);
      if (syncFail.length) {
        setSaveError(
          `Saved locally, but Mirotech sync failed: ${syncFail.map((r) => r.error).filter(Boolean).join("; ") || "unknown error"}`
        );
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
      setSaveStatus("error");
    }
  }

  async function runAssist(
    action: BlogAssistAction,
    options?: { post?: BlogPost; replaceBody?: boolean; itineraryDayIndex?: number }
  ) {
    const target = options?.post ?? selected;
    if (!target) return;
    const dayIndex = options?.itineraryDayIndex ?? travelAiDayIndex;

    if (target.id !== selected?.id) {
      setSelectedId(target.id);
      setSuggestions(null);
      setAiError("");
    }

    if (action === "format") {
      if (
        !window.confirm(
          "Regenerate all text sections for BRIGHTLINE Journal? Title, excerpt, body, tags, and SEO will update. Images stay as-is."
        )
      ) {
        return;
      }
    }

    if (action === "travelGenerateAll") {
      if (
        !window.confirm(
          "Generate all travel sections, excerpt, body, tags, SEO, and takeaways from the destination and image alts? Existing text in those fields will be replaced."
        )
      ) {
        return;
      }
    }

    if ((action === "polish" || action === "fix") && target.body.trim()) {
      const label = action === "polish" ? "polish" : "correct";
      if (!options?.replaceBody && !window.confirm(`Replace your draft body with the AI-${label}ed version?`)) {
        return;
      }
    }

    setAiLoading(`${target.id}:${action}`);
    setAiError("");
    if (action !== "suggest") setSuggestions(null);

    try {
      const res = await fetch("/api/admin/blog-posts/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          draft: {
            title: target.title,
            excerpt: target.excerpt,
            body: target.body,
            tags: target.tags,
            seoTitle: target.seoTitle,
            seoDescription: target.seoDescription,
            coverImageAlt: target.coverImageAlt,
            galleryImageCount: target.galleryImages.length,
            galleryImageAlts: target.galleryImages.map((image) => image.alt),
            caseBrief: target.caseStudy?.brief,
            caseProblem: target.caseStudy?.problem,
            caseSolution: target.caseStudy?.solution,
            caseVideoCaption: target.caseStudy?.videoCaption,
            caseVideoPrompt: target.caseStudy?.aiVideoPrompt,
            travelDestination: target.travel?.destination,
            travelRegion: target.travel?.region,
            travelDatesLabel: target.travel?.datesLabel,
            travelHighlights: target.travel?.highlights,
            travelTips: target.travel?.tips,
            travelWhereStayed: target.travel?.whereWeStayed,
            travelPacking: target.travel?.packingNotes,
            travelCameraKit: target.travel?.cameraKit,
            travelEssentials: target.travel?.essentials,
            travelSeason: target.travel?.season,
            travelRoute: target.travel?.routeSummary,
            travelTripStyle: target.travel?.tripStyle,
            travelTravelers: target.travel?.travelers,
            travelItineraryDay:
              dayIndex != null ? target.travel?.itinerary?.[dayIndex] : undefined,
            pullQuote: target.pullQuote,
            keyTakeaways: target.keyTakeaways,
            photoCredits: target.photoCredits,
            format: target.format || "journal",
          },
          itineraryDayIndex: dayIndex ?? undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        result?: BlogSuggestResult &
          BlogFormatResult & {
            body?: string;
            excerpt?: string;
            title?: string;
            tags?: string[];
            coverImageAlt?: string;
            seoTitle?: string;
            seoDescription?: string;
            galleryAlts?: string[];
            caseBrief?: string;
            caseProblem?: string;
            caseSolution?: string;
            caseVideoCaption?: string;
            caseVideoPrompt?: string;
            travelHighlights?: string;
            travelTips?: string;
            travelWhereStayed?: string;
            travelPacking?: string;
            travelCameraKit?: string;
            travelEssentials?: string;
            travelSeason?: string;
            travelRoute?: string;
            travelItineraryDay?: {
              dayLabel?: string;
              title?: string;
              body?: string;
              place?: string;
            };
            travelItinerary?: Array<{
              dayLabel?: string;
              title?: string;
              body?: string;
              place?: string;
            }>;
            pullQuote?: string;
            keyTakeaways?: string;
            photoCredits?: string;
          };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.result) {
        throw new Error(json.error ?? "AI assist failed.");
      }

      const result = json.result;
      const applyToId = target.id;

      function patchSelected(patch: Partial<BlogPost>) {
        setPosts((current) =>
          current.map((post) => {
            if (post.id !== applyToId) return post;
            const next = {
              ...post,
              ...patch,
              updatedAt: new Date().toISOString(),
            };
            if (patch.title && !patch.slug) {
              next.slug = slugifyBlog(patch.title) || post.slug;
            }
            return next;
          })
        );
        setDirty();
      }

      if (action === "suggest") {
        setSuggestions(result as BlogSuggestResult);
      } else if (action === "polish" || action === "fix" || action === "body") {
        if (result.body) patchSelected({ body: result.body });
      } else if (action === "excerpt") {
        if (result.excerpt) patchSelected({ excerpt: result.excerpt });
      } else if (action === "title") {
        if (result.title) patchSelected({ title: result.title });
      } else if (action === "tags") {
        if (result.tags?.length) patchSelected({ tags: result.tags });
      } else if (action === "coverAlt") {
        if (result.coverImageAlt) patchSelected({ coverImageAlt: result.coverImageAlt });
      } else if (action === "seoTitle") {
        if (result.seoTitle) patchSelected({ seoTitle: result.seoTitle });
      } else if (action === "seoDescription") {
        if (result.seoDescription) patchSelected({ seoDescription: result.seoDescription });
      } else if (action === "seo") {
        patchSelected({
          ...(result.seoTitle ? { seoTitle: result.seoTitle } : {}),
          ...(result.seoDescription ? { seoDescription: result.seoDescription } : {}),
        });
      } else if (action === "galleryAlts" && result.galleryAlts?.length) {
        patchSelected({
          galleryImages: target.galleryImages.map((image, index) => ({
            ...image,
            alt: result.galleryAlts?.[index] ?? image.alt,
          })),
        });
      } else if (action === "caseBrief" && result.caseBrief) {
        const current = target.caseStudy ?? blankCaseStudy();
        patchSelected({
          caseStudy: { ...current, briefEnabled: true, brief: result.caseBrief },
        });
      } else if (action === "caseProblem" && result.caseProblem) {
        const current = target.caseStudy ?? blankCaseStudy();
        patchSelected({
          caseStudy: { ...current, problemEnabled: true, problem: result.caseProblem },
        });
      } else if (action === "caseSolution" && result.caseSolution) {
        const current = target.caseStudy ?? blankCaseStudy();
        patchSelected({
          caseStudy: { ...current, solutionEnabled: true, solution: result.caseSolution },
        });
      } else if (action === "caseVideoCaption" && result.caseVideoCaption) {
        const current = target.caseStudy ?? blankCaseStudy();
        patchSelected({
          caseStudy: {
            ...current,
            videoEnabled: true,
            videoCaption: result.caseVideoCaption,
          },
        });
      } else if (action === "caseVideoPrompt" && result.caseVideoPrompt) {
        const current = target.caseStudy ?? blankCaseStudy();
        patchSelected({
          caseStudy: {
            ...current,
            videoEnabled: true,
            aiVideoPrompt: result.caseVideoPrompt,
          },
        });
      } else if (action === "travelHighlights" && result.travelHighlights) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, highlights: result.travelHighlights } });
      } else if (action === "travelTips" && result.travelTips) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, tips: result.travelTips } });
      } else if (action === "travelWhereStayed" && result.travelWhereStayed) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, whereWeStayed: result.travelWhereStayed } });
      } else if (action === "travelPacking" && result.travelPacking) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, packingNotes: result.travelPacking } });
      } else if (action === "travelCameraKit" && result.travelCameraKit) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, cameraKit: result.travelCameraKit } });
      } else if (action === "travelEssentials" && result.travelEssentials) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, essentials: result.travelEssentials } });
      } else if (action === "travelSeason" && result.travelSeason) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, season: result.travelSeason } });
      } else if (action === "travelRoute" && result.travelRoute) {
        const current = target.travel ?? blankTravel();
        patchSelected({ travel: { ...current, routeSummary: result.travelRoute } });
      } else if (action === "pullQuote" && result.pullQuote) {
        patchSelected({ pullQuote: result.pullQuote });
      } else if (action === "keyTakeaways" && result.keyTakeaways) {
        patchSelected({ keyTakeaways: result.keyTakeaways });
      } else if (action === "photoCredits" && result.photoCredits) {
        patchSelected({ photoCredits: result.photoCredits });
      } else if (action === "imageMeta") {
        patchSelected({
          ...(result.excerpt ? { excerpt: result.excerpt } : {}),
          ...(result.tags?.length ? { tags: result.tags } : {}),
          ...(result.seoTitle ? { seoTitle: result.seoTitle } : {}),
          ...(result.seoDescription ? { seoDescription: result.seoDescription } : {}),
          ...(result.coverImageAlt && !target.coverImageAlt
            ? { coverImageAlt: result.coverImageAlt }
            : {}),
          ...(result.pullQuote ? { pullQuote: result.pullQuote } : {}),
          ...(result.keyTakeaways ? { keyTakeaways: result.keyTakeaways } : {}),
        });
      } else if (action === "travelGenerateAll") {
        const current = target.travel ?? blankTravel();
        const itinerary =
          result.travelItinerary?.map((day, i) => ({
            dayLabel: day.dayLabel || `Day ${i + 1}`,
            title: day.title || "",
            body: day.body || "",
            place: day.place || "",
          })) ?? current.itinerary;
        patchSelected({
          ...(result.excerpt ? { excerpt: result.excerpt } : {}),
          ...(result.body ? { body: result.body } : {}),
          ...(result.tags?.length ? { tags: result.tags } : {}),
          ...(result.seoTitle ? { seoTitle: result.seoTitle } : {}),
          ...(result.seoDescription ? { seoDescription: result.seoDescription } : {}),
          ...(result.pullQuote ? { pullQuote: result.pullQuote } : {}),
          ...(result.keyTakeaways ? { keyTakeaways: result.keyTakeaways } : {}),
          ...(result.photoCredits ? { photoCredits: result.photoCredits } : {}),
          travel: {
            ...current,
            ...(result.travelSeason ? { season: result.travelSeason } : {}),
            ...(result.travelRoute ? { routeSummary: result.travelRoute } : {}),
            ...(result.travelHighlights ? { highlights: result.travelHighlights } : {}),
            ...(result.travelTips ? { tips: result.travelTips } : {}),
            ...(result.travelWhereStayed ? { whereWeStayed: result.travelWhereStayed } : {}),
            ...(result.travelPacking ? { packingNotes: result.travelPacking } : {}),
            ...(result.travelCameraKit ? { cameraKit: result.travelCameraKit } : {}),
            ...(result.travelEssentials ? { essentials: result.travelEssentials } : {}),
            itinerary,
          },
        });
      } else if (action === "travelItineraryDay" && result.travelItineraryDay && dayIndex != null) {
        const current = target.travel ?? blankTravel();
        const itinerary = current.itinerary.map((day, i) =>
          i === dayIndex
            ? {
                dayLabel: result.travelItineraryDay?.dayLabel || day.dayLabel,
                title: result.travelItineraryDay?.title || day.title,
                body: result.travelItineraryDay?.body || day.body,
                place: result.travelItineraryDay?.place || day.place || "",
              }
            : day
        );
        patchSelected({ travel: { ...current, itinerary } });
      } else if (action === "format") {
        patchSelected({
          ...(result.title ? { title: result.title } : {}),
          excerpt: result.excerpt,
          body: result.body,
          tags: result.tags ?? target.tags,
          seoTitle: result.seoTitle,
          seoDescription: result.seoDescription,
        });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI assist failed.");
    } finally {
      setAiLoading(null);
      setTravelAiDayIndex(null);
    }
  }

  function isAiBusy(action: BlogAssistAction | string) {
    return aiLoading === `${selected?.id}:${action}`;
  }

  function regenerate(action: BlogAssistAction) {
    return () => void runAssist(action, { replaceBody: true });
  }

  function runTravelAi(
    action:
      | "travelHighlights"
      | "travelTips"
      | "travelItineraryDay"
      | "travelWhereStayed"
      | "travelPacking"
      | "travelCameraKit"
      | "travelEssentials"
      | "travelSeason"
      | "travelRoute"
      | "travelGenerateAll",
    dayIndex?: number
  ) {
    if (dayIndex != null) setTravelAiDayIndex(dayIndex);
    else setTravelAiDayIndex(null);
    void runAssist(action as BlogAssistAction, {
      replaceBody: true,
      itineraryDayIndex: dayIndex,
    });
  }

  function patchPostById(
    postId: string,
    patch: Partial<BlogPost> | ((post: BlogPost) => Partial<BlogPost>)
  ) {
    setPosts((current) =>
      current.map((post) => {
        if (post.id !== postId) return post;
        const updates = typeof patch === "function" ? patch(post) : patch;
        const next = {
          ...post,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        if ("title" in updates && updates.title && !("slug" in updates)) {
          next.slug = slugifyBlog(updates.title) || post.slug;
        }
        return next;
      })
    );
    setDirty();
  }

  async function scanImageAlts(
    post: BlogPost,
    targets: { url: string; galleryIndex?: number }[],
    options?: { fillMeta?: boolean }
  ) {
    if (targets.length === 0) return;
    const postId = post.id;
    const isGallery = targets.some((t) => t.galleryIndex !== undefined);

    setAltScanning({
      type: isGallery ? "gallery" : "cover",
      done: 0,
      total: targets.length,
    });
    setAiError("");

    let completed = 0;
    const scannedAlts: { galleryIndex?: number; alt: string }[] = [];
    try {
      await mapWithConcurrency(
        targets,
        async (target) => {
          const altText = await fetchVisionAltText(target.url, post);
          scannedAlts.push({ galleryIndex: target.galleryIndex, alt: altText });
          if (target.galleryIndex !== undefined) {
            patchPostById(postId, (current) => ({
              galleryImages: current.galleryImages.map((image, index) =>
                index === target.galleryIndex ? { ...image, alt: altText } : image
              ),
            }));
          } else {
            patchPostById(postId, { coverImageAlt: altText });
          }
          completed += 1;
          setAltScanning((current) =>
            current
              ? {
                  ...current,
                  done: completed,
                }
              : null
          );
        },
        2
      );

      if (options?.fillMeta !== false && (isGallery || scannedAlts.length > 0)) {
        setAltScanning(null);
        // Build draft from scanned alts + existing post for SEO/description
        const galleryAlts = post.galleryImages.map((img, index) => {
          const hit = scannedAlts.find((s) => s.galleryIndex === index);
          return hit?.alt || img.alt || "";
        });
        const coverAlt =
          scannedAlts.find((s) => s.galleryIndex === undefined)?.alt || post.coverImageAlt;
        setAiLoading(`${postId}:imageMeta`);
        try {
          const res = await fetch("/api/admin/blog-posts/assist", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "imageMeta",
              draft: {
                title: post.title,
                excerpt: post.excerpt,
                body: post.body,
                tags: post.tags,
                coverImageAlt: coverAlt,
                galleryImageAlts: galleryAlts.filter(Boolean),
                galleryImageCount: galleryAlts.filter(Boolean).length,
                format: post.format || "journal",
                travelDestination: post.travel?.destination,
                travelRegion: post.travel?.region,
              },
            }),
          });
          const json = (await res.json()) as {
            ok?: boolean;
            error?: string;
            result?: {
              excerpt?: string;
              tags?: string[];
              seoTitle?: string;
              seoDescription?: string;
              coverImageAlt?: string;
              pullQuote?: string;
              keyTakeaways?: string;
            };
          };
          if (res.ok && json.ok && json.result) {
            const r = json.result;
            patchPostById(postId, (current) => ({
              ...(r.excerpt ? { excerpt: r.excerpt } : {}),
              ...(r.tags?.length ? { tags: r.tags } : {}),
              ...(r.seoTitle ? { seoTitle: r.seoTitle } : {}),
              ...(r.seoDescription ? { seoDescription: r.seoDescription } : {}),
              ...(r.coverImageAlt && !current.coverImageAlt
                ? { coverImageAlt: r.coverImageAlt }
                : {}),
              ...(r.pullQuote ? { pullQuote: r.pullQuote } : {}),
              ...(r.keyTakeaways ? { keyTakeaways: r.keyTakeaways } : {}),
            }));
          }
        } catch {
          // Meta fill is best-effort after alt scan
        } finally {
          setAiLoading(null);
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Image alt scan failed.");
    } finally {
      setAltScanning(null);
    }
  }

  async function scanCoverAlt() {
    if (!selected?.coverImageUrl.trim()) {
      await runAssist("coverAlt");
      return;
    }
    await scanImageAlts(selected, [{ url: selected.coverImageUrl }]);
  }

  async function scanGalleryAlts(indices?: number[]) {
    if (!selected) return;
    const targets = selected.galleryImages
      .map((image, index) => ({ image, index }))
      .filter(({ image, index }) => image.url.trim() && (indices ? indices.includes(index) : true))
      .map(({ image, index }) => ({ url: image.url, galleryIndex: index }));

    if (targets.length === 0) {
      setAiError("Add gallery images before scanning alt text.");
      return;
    }

    await scanImageAlts(selected, targets, {
      // Full gallery / bulk scan fills description + SEO; single-image rescan only updates alt.
      fillMeta: !indices || indices.length !== 1,
    });
  }

  async function scanBeforeAfterAlt(side: "before" | "after") {
    if (!selected) return;
    const current = selected.beforeAfter ?? blankBeforeAfter();
    const url = side === "before" ? current.beforeImageUrl.trim() : current.afterImageUrl.trim();
    if (!url) {
      setAiError(`Add a ${side} image before generating alt text.`);
      return;
    }

    const postId = selected.id;
    const postSnapshot = selected;
    setAiError("");
    setAltScanning({ type: side, done: 0, total: 1 });
    try {
      const altText = await fetchVisionAltText(url, postSnapshot);
      if (altText) {
        patchPostById(postId, (post) => {
          const latest = post.beforeAfter ?? blankBeforeAfter();
          return {
            beforeAfter: {
              ...latest,
              ...(side === "before" ? { beforeImageAlt: altText } : { afterImageAlt: altText }),
            },
          };
        });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : `Could not generate ${side} image alt text.`);
    } finally {
      setAltScanning(null);
    }
  }

  function applySuggestion(patch: Partial<BlogPost>) {
    updateSelected(patch);
  }

  function updateBeforeAfter(patch: Partial<BlogBeforeAfter>) {
    if (!selected) return;
    const current = selected.beforeAfter ?? blankBeforeAfter();
    updateSelected({ beforeAfter: { ...current, ...patch } });
  }

  function updateCaseStudy(patch: Partial<BlogCaseStudySections>) {
    if (!selected) return;
    const current = selected.caseStudy ?? blankCaseStudy();
    updateSelected({ caseStudy: { ...current, ...patch } });
  }

  async function startAiVideoGeneration() {
    if (!selected) return;
    const cs = selected.caseStudy ?? blankCaseStudy();
    const source =
      cs.aiVideoSourceUrl.trim() ||
      selected.coverImageUrl.trim() ||
      selected.galleryImages[0]?.url?.trim() ||
      "";
    if (!source) {
      setAiError("Pick a source image (cover, gallery, or URL) before generating video.");
      return;
    }
    if (
      !window.confirm(
        "Generate an AI video (~5s) from this still? This uses your fal.ai credits and may take a minute."
      )
    ) {
      return;
    }

    setAiVideoBusy(true);
    setAiVideoMessage("Submitting…");
    setAiError("");
    try {
      const res = await fetch("/api/admin/blog-posts/ai-video", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: selected.id,
          sourceImageUrl: source,
          prompt: cs.aiVideoPrompt,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        post?: BlogPost;
        status?: string;
      };
      if (!res.ok || !json.ok || !json.post) {
        throw new Error(json.error ?? "Failed to start AI video.");
      }
      setPosts((current) => current.map((p) => (p.id === json.post!.id ? json.post! : p)));
      setDirty();
      setAiVideoMessage("Generating…");
      await pollAiVideoUntilDone(selected.id);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI video failed.");
      setAiVideoMessage("");
    } finally {
      setAiVideoBusy(false);
    }
  }

  async function pollAiVideoUntilDone(postId: string) {
    const maxAttempts = 90;
    for (let i = 0; i < maxAttempts; i += 1) {
      await new Promise((r) => setTimeout(r, 4000));
      const res = await fetch(`/api/admin/blog-posts/ai-video?postId=${encodeURIComponent(postId)}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        status?: string;
        error?: string;
        post?: BlogPost;
        key?: string;
      };
      if (json.post) {
        setPosts((current) => current.map((p) => (p.id === json.post!.id ? json.post! : p)));
        setDirty();
      }
      if (json.status === "ready") {
        setAiVideoMessage("Ready — save the post to keep this on the live site.");
        return;
      }
      if (json.status === "failed" || (!res.ok && json.error)) {
        throw new Error(json.error ?? "AI video generation failed.");
      }
      setAiVideoMessage(
        json.status === "queued" ? "Queued…" : `Generating… (${i + 1}/${maxAttempts})`
      );
    }
    throw new Error("Timed out waiting for AI video. Poll again in a moment.");
  }

  async function clearAiVideo() {
    if (!selected) return;
    if (!window.confirm("Clear the generated AI video from this post?")) return;
    setAiVideoBusy(true);
    setAiError("");
    try {
      const res = await fetch(
        `/api/admin/blog-posts/ai-video?postId=${encodeURIComponent(selected.id)}`,
        { method: "DELETE", credentials: "include" }
      );
      const json = (await res.json()) as { ok?: boolean; error?: string; post?: BlogPost };
      if (!res.ok || !json.ok || !json.post) {
        throw new Error(json.error ?? "Failed to clear AI video.");
      }
      setPosts((current) => current.map((p) => (p.id === json.post!.id ? json.post! : p)));
      setDirty();
      setAiVideoMessage("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to clear AI video.");
    } finally {
      setAiVideoBusy(false);
    }
  }

  async function useR2Keys(keys: string[]) {
    if (!selected) return;
    const urls = keys.map(getPublicR2Url).filter(Boolean);
    if (urls.length === 0) return;

    const postId = selected.id;
    const postSnapshot = selected;

    if (r2Target === "gallery") {
      const startIndex = postSnapshot.galleryImages.length;
      const placeholders: BlogGalleryImage[] = urls.map((url) => ({
        id: newGalleryImageId(),
        url,
        alt: "",
      }));
      patchPostById(postId, {
        galleryImages: [...postSnapshot.galleryImages, ...placeholders],
      });
      setR2Target(null);

      await scanImageAlts(
        { ...postSnapshot, galleryImages: [...postSnapshot.galleryImages, ...placeholders] },
        urls.map((url, offset) => ({ url, galleryIndex: startIndex + offset }))
      );
      return;
    }

    if (r2Target === "before" || r2Target === "after") {
      const side = r2Target;
      const url = urls[0] ?? "";
      const current = postSnapshot.beforeAfter ?? blankBeforeAfter();
      const next: BlogBeforeAfter =
        side === "before"
          ? { ...current, beforeImageUrl: url, beforeImageAlt: "" }
          : { ...current, afterImageUrl: url, afterImageAlt: "" };
      patchPostById(postId, { beforeAfter: next });
      setR2Target(null);
      if (url) {
        try {
          const altText = await fetchVisionAltText(url, postSnapshot);
          if (altText) {
            patchPostById(postId, {
              beforeAfter: {
                ...next,
                ...(side === "before" ? { beforeImageAlt: altText } : { afterImageAlt: altText }),
              },
            });
          }
        } catch {
          // optional alt generation
        }
      }
      return;
    }

    if (r2Target === "googleReviewLibrary") {
      googleReviewPhotoPickerRef.current?.(urls);
      googleReviewPhotoPickerRef.current = null;
      setR2Target(null);
      return;
    }

    if (r2Target === "videoPoster") {
      const url = urls[0] ?? "";
      const current = postSnapshot.caseStudy ?? blankCaseStudy();
      patchPostById(postId, {
        caseStudy: { ...current, videoPosterUrl: url },
      });
      setR2Target(null);
      return;
    }

    const coverUrl = urls[0] ?? "";
    patchPostById(postId, { coverImageUrl: coverUrl, coverImageAlt: "" });
    setR2Target(null);
    if (coverUrl) {
      await scanImageAlts({ ...postSnapshot, coverImageUrl: coverUrl }, [{ url: coverUrl }]);
    }
  }

  function updateGalleryImage(index: number, patch: Partial<BlogGalleryImage>) {
    if (!selected) return;
    const next = selected.galleryImages.map((image, i) =>
      i === index ? { ...image, ...patch } : image
    );
    updateSelected({ galleryImages: next });
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    if (!selected) return;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= selected.galleryImages.length) return;
    const next = [...selected.galleryImages];
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
    updateSelected({ galleryImages: next });
  }

  function removeGalleryImage(index: number) {
    if (!selected) return;
    updateSelected({
      galleryImages: selected.galleryImages.filter((_, i) => i !== index),
    });
  }

  if (!selected && sharedHubBlogs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/70">
        <p className="font-display text-3xl text-white">Your journal starts here</p>
        <p className="mt-3 text-sm">Create your first blog post — it stays private as a draft until you publish.</p>
        <button type="button" className="btn btn-primary mt-8" onClick={addPost}>
          New journal post
        </button>
        <button type="button" className="btn btn-ghost mt-4" onClick={addTravelPost}>
          New travel post
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <R2BrowserModal
        isOpen={r2Target !== null && Boolean(selected)}
        onClose={() => setR2Target(null)}
        onAddKeys={useR2Keys}
        mode={r2Target === "gallery" || r2Target === "googleReviewLibrary" ? "multiple" : "single"}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Journal & Travel</p>
          <h1 className="mt-2 font-display text-4xl text-white">Blog</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Write journal or travel posts in draft, refine with AI, and publish when ready. Shared
            hub blogs from Studio CMS appear under the Shared filter — edit them in the project hub.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!viewingShared && selected?.status === "PUBLISHED" ? (
            <Link
              href={
                selected.format === "travel"
                  ? `/travel/${selected.slug}`
                  : `/blog/${selected.slug}`
              }
              className="btn btn-ghost"
            >
              View live
            </Link>
          ) : null}
          {!viewingShared && selected ? (
            <Link href={`/admin/blog/preview/${selected.id}`} className="btn btn-ghost">
              Preview
            </Link>
          ) : null}
          {viewingShared && selectedShared ? (
            <>
              <Link href={selectedShared.previewHref} className="btn btn-ghost" target="_blank">
                Preview
              </Link>
              <Link href={selectedShared.hubHref} className="btn btn-primary">
                Open in Studio CMS
              </Link>
            </>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={addTravelPost}>
            New travel
          </button>
          <button type="button" className="btn btn-ghost" onClick={addPost}>
            New journal
          </button>
          {!viewingShared ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={saveStatus === "saving" || !selected}
              onClick={() => void save()}
            >
              {saveStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-white/55">
        <span className="rounded-full border border-white/10 px-3 py-1">
          {posts.length + sharedCount} posts
        </span>
        <span className="rounded-full border border-amber-400/20 px-3 py-1 text-amber-100">{draftCount} drafts</span>
        <span className="rounded-full border border-emerald-400/20 px-3 py-1 text-emerald-200">{publishedCount} live</span>
        <span className="rounded-full border border-sky-400/20 px-3 py-1 text-sky-200">{travelCount} travel</span>
        <span className="rounded-full border border-violet-400/20 px-3 py-1 text-violet-200">
          {sharedCount} shared
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "journal" as const, label: "Journal" },
            { id: "travel" as const, label: "Travel" },
            { id: "shared" as const, label: "Shared" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setFormatFilter(tab.id);
              if (tab.id === "shared") {
                setSelectionMode("shared");
                if (!selectedSharedId && sharedHubBlogs[0]) {
                  setSelectedSharedId(sharedHubBlogs[0].journalId);
                }
              } else if (tab.id !== "all") {
                setSelectionMode("local");
                setSelectedSharedId(null);
              }
            }}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
              formatFilter === tab.id
                ? "border-white/40 bg-white text-black"
                : "border-white/15 bg-black/20 text-white/70 hover:border-white/30 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {saveError ? <p className="mt-4 text-sm text-red-300">{saveError}</p> : null}
      {saveStatus === "saved" ? <p className="mt-4 text-sm text-emerald-300">Saved.</p> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {filteredPosts.map((post) => {
            const isActive = selectionMode === "local" && post.id === selected?.id;
            const aiBusy = aiLoading === `${post.id}:format`;
            return (
              <div
                key={post.id}
                className={`flex items-stretch gap-2 rounded-2xl border transition ${
                  isActive ? "border-white/40 bg-white text-black" : "border-white/10 bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectionMode("local");
                    setSelectedSharedId(null);
                    setSelectedId(post.id);
                    setSuggestions(null);
                    setAiError("");
                  }}
                  className={`min-w-0 flex-1 px-4 py-3 text-left ${
                    isActive ? "text-black" : "text-white/75 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-medium line-clamp-2">{post.title || "Untitled"}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
                    <span className={`rounded-full border px-2 py-0.5 ${statusBadge(post.status)}`}>{post.status}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 ${
                        post.format === "travel"
                          ? "border-sky-400/30 text-sky-200"
                          : "border-white/20"
                      }`}
                    >
                      {post.format === "travel" ? "Travel" : "Journal"}
                    </span>
                    {isImportedJournalSlug(post.slug) ? (
                      <span className="rounded-full border border-sky-400/30 px-2 py-0.5 text-sky-200">Import</span>
                    ) : null}
                    <span>{formatBlogDate(post.updatedAt)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  title="Format with AI for BRIGHTLINE Journal"
                  disabled={aiLoading !== null}
                  onClick={() => void runAssist("format", { post })}
                  className={`shrink-0 self-center rounded-xl border px-2.5 py-2 text-[0.62rem] font-medium uppercase tracking-[0.16em] transition ${
                    isActive
                      ? "border-black/15 bg-black/5 text-black hover:bg-black/10"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                  } disabled:opacity-40`}
                >
                  {aiBusy ? "…" : "AI"}
                </button>
              </div>
            );
          })}
          {filteredShared.map((entry) => {
            const isActive = selectionMode === "shared" && entry.journalId === selectedShared?.journalId;
            return (
              <button
                key={`shared-${entry.journalId}`}
                type="button"
                onClick={() => {
                  setSelectionMode("shared");
                  setSelectedSharedId(entry.journalId);
                  setSuggestions(null);
                  setAiError("");
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-white/40 bg-white text-black"
                    : "border-white/10 bg-white/5 text-white/75 hover:text-white"
                }`}
              >
                <span className="block text-sm font-medium line-clamp-2">{entry.title || "Untitled"}</span>
                <span className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
                  <span
                    className={`rounded-full border px-2 py-0.5 ${
                      entry.status === "PUBLISHED"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                    }`}
                  >
                    {entry.status}
                  </span>
                  <span className="rounded-full border border-violet-400/30 px-2 py-0.5 text-violet-200">
                    Shared
                  </span>
                  <span className="normal-case tracking-normal opacity-80">{entry.projectTitle}</span>
                </span>
              </button>
            );
          })}
          {filteredPosts.length === 0 && filteredShared.length === 0 ? (
            <p className="px-2 py-6 text-sm text-white/45">No posts in this filter.</p>
          ) : null}
        </aside>

        {viewingShared && selectedShared ? (
          <div className="space-y-6">
            <section className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-6 space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-violet-200/80">Shared · Studio hub</p>
              <h2 className="font-display text-2xl text-white">{selectedShared.title}</h2>
              <p className="text-sm text-white/65">
                Linked to project <span className="text-white/90">{selectedShared.projectTitle}</span>.
                Dual-brand journal posts are edited in Studio CMS (not in this local Blog editor) so
                Mirotech and Brightline stay in sync.
              </p>
              <dl className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">Status</dt>
                  <dd className="mt-1">{selectedShared.status}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">Primary site</dt>
                  <dd className="mt-1">{selectedShared.primarySite}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-white/45">Slug</dt>
                  <dd className="mt-1 font-mono text-xs">{selectedShared.slug}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href={selectedShared.hubHref} className="btn btn-primary">
                  Edit in Studio CMS
                </Link>
                <Link href={selectedShared.previewHref} className="btn btn-ghost" target="_blank">
                  Admin preview
                </Link>
                {selectedShared.status === "PUBLISHED" &&
                (selectedShared.primarySite === "BOTH" ||
                  selectedShared.primarySite === "BRIGHTLINE") ? (
                  <Link
                    href={`https://brightlinephotography.com/blog/shared/${encodeURIComponent(selectedShared.slug)}`}
                    className="btn btn-ghost"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View live Brightline
                  </Link>
                ) : null}
                {selectedShared.status === "PUBLISHED" &&
                (selectedShared.primarySite === "BOTH" ||
                  selectedShared.primarySite === "MIROTECH") ? (
                  <Link
                    href={`https://mirotech.solutions/journal/${encodeURIComponent(selectedShared.slug)}`}
                    className="btn btn-ghost"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View live Mirotech
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        ) : selected ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Visibility</p>
                <p className="mt-1 text-sm text-white/65">
                  {selected.status === "DRAFT"
                    ? selected.format === "travel"
                      ? "Draft travel story — publish when ready for /travel."
                      : "Only you can see this post. Publish when it is ready for /blog."
                    : selected.format === "travel"
                      ? "This travel story is live on /travel."
                      : "This post is live on the public journal."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn text-xs ${selected.status === "DRAFT" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setStatus("DRAFT")}
                >
                  Draft
                </button>
                <button
                  type="button"
                  className={`btn text-xs ${selected.status === "PUBLISHED" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setStatus("PUBLISHED")}
                >
                  Publish
                </button>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] text-white/45">Format</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn text-xs ${(selected.format || "journal") === "journal" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPostFormat("journal")}
                >
                  Journal
                </button>
                <button
                  type="button"
                  className={`btn text-xs ${selected.format === "travel" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPostFormat("travel")}
                >
                  Travel
                </button>
              </div>
            </div>
          </section>

          <BlogDistributionPanel
            post={selected}
            onChange={(patch) => {
              updateSelected(patch);
            }}
          />

          {selected.format === "travel" ? (
            <BlogTravelPanel
              post={selected}
              onChange={(patch) => updateSelected(patch)}
              onAiField={runTravelAi}
              aiLoading={
                aiLoading?.startsWith(`${selected.id}:`)
                  ? aiLoading.slice(`${selected.id}:`.length)
                  : null
              }
            />
          ) : null}

          <BlogMediaKitPanel
            post={selected}
            onPostUpdate={(next) => {
              setPosts((current) => current.map((p) => (p.id === next.id ? next : p)));
            }}
            onDirty={setDirty}
          />

          <BlogCanvaPanel
            post={selected}
            onPostUpdate={(next) => {
              setPosts((current) => current.map((p) => (p.id === next.id ? next : p)));
            }}
            onDirty={setDirty}
          />

          <BlogSharePanel
            post={selected}
            onPostUpdate={(next) => {
              setPosts((current) => current.map((p) => (p.id === next.id ? next : p)));
            }}
            onDirty={setDirty}
          />

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Post content</p>
                <p className="mt-1 text-sm text-white/60">
                  Use ✦ AI on any field to regenerate it in BRIGHTLINE Journal voice.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  disabled={aiLoading !== null}
                  onClick={regenerate("format")}
                >
                  {isAiBusy("format") ? "Regenerating…" : "Regenerate all sections"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={aiLoading !== null}
                  onClick={regenerate("suggest")}
                >
                  {isAiBusy("suggest") ? "Reviewing…" : "Review suggestions"}
                </button>
              </div>
            </div>

            {aiError ? <p className="text-sm text-red-300">{aiError}</p> : null}
            {altScanning ? (
              <p className="text-sm text-violet-200">
                {altScanning.type === "cover"
                  ? "Scanning cover image and writing alt text…"
                  : altScanning.type === "before"
                    ? "Scanning before image and writing alt text…"
                    : altScanning.type === "after"
                      ? "Scanning after image and writing alt text…"
                      : `Scanning gallery images with AI (${altScanning.done}/${altScanning.total})…`}
              </p>
            ) : null}

            {suggestions ? (
              <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-violet-200/80">Suggestions</p>
                {suggestions.suggestions.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
                    {suggestions.suggestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-white/55">No specific suggestions — your draft looks solid.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.improvedTitle ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ title: suggestions.improvedTitle })}>
                      Apply title
                    </button>
                  ) : null}
                  {suggestions.improvedExcerpt ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ excerpt: suggestions.improvedExcerpt })}>
                      Apply excerpt
                    </button>
                  ) : null}
                  {suggestions.improvedBody ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ body: suggestions.improvedBody })}>
                      Apply body
                    </button>
                  ) : null}
                  {suggestions.improvedSeoTitle ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ seoTitle: suggestions.improvedSeoTitle })}>
                      Apply SEO title
                    </button>
                  ) : null}
                  {suggestions.improvedSeoDescription ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => applySuggestion({ seoDescription: suggestions.improvedSeoDescription })}
                    >
                      Apply SEO description
                    </button>
                  ) : null}
                  {suggestions.suggestedTags?.length ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ tags: suggestions.suggestedTags })}>
                      Apply tags
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <EditorField
                  label="Title"
                  onRegenerate={regenerate("title")}
                  aiLoading={isAiBusy("title")}
                  aiDisabled={aiLoading !== null}
                >
                  <input
                    value={selected.title}
                    onChange={(event) => updateSelected({ title: event.target.value })}
                    className={INPUT_CLASS}
                  />
                </EditorField>
              </div>

              <EditorField label="URL slug" hint="Edit independently from the title. Change carefully if the post is already live.">
                <input
                  value={selected.slug}
                  onChange={(event) => updateSelected({ slug: slugifyBlog(event.target.value) })}
                  className={`${INPUT_CLASS} font-mono`}
                />
              </EditorField>

              <EditorField label="Author">
                <input
                  value={selected.author}
                  onChange={(event) => updateSelected({ author: event.target.value })}
                  className={INPUT_CLASS}
                />
              </EditorField>

              <div className="sm:col-span-2">
                <EditorField
                  label="Excerpt"
                  hint="Short summary for the blog index card."
                  onRegenerate={regenerate("excerpt")}
                  aiLoading={isAiBusy("excerpt")}
                  aiDisabled={aiLoading !== null}
                >
                  <textarea
                    value={selected.excerpt}
                    onChange={(event) => updateSelected({ excerpt: event.target.value })}
                    rows={2}
                    placeholder="Short summary for the blog index card"
                    className={INPUT_CLASS}
                  />
                </EditorField>
              </div>
            </div>

            <EditorField
              label="Pull quote"
              hint="Optional editorial quote shown under the excerpt."
              onRegenerate={regenerate("pullQuote")}
              aiLoading={isAiBusy("pullQuote")}
              aiDisabled={aiLoading !== null}
            >
              <textarea
                value={selected.pullQuote || ""}
                onChange={(event) => updateSelected({ pullQuote: event.target.value })}
                rows={2}
                placeholder="A single strong line from the story"
                className={INPUT_CLASS}
              />
            </EditorField>

            <EditorField
              label="Key takeaways"
              hint="One takeaway per line — shown as a callout list."
              onRegenerate={regenerate("keyTakeaways")}
              aiLoading={isAiBusy("keyTakeaways")}
              aiDisabled={aiLoading !== null}
            >
              <textarea
                value={selected.keyTakeaways || ""}
                onChange={(event) => updateSelected({ keyTakeaways: event.target.value })}
                rows={4}
                placeholder={"Light over location\nArrive early for soft edges\n…"}
                className={INPUT_CLASS}
              />
            </EditorField>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white/70">Body</p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {selected.format === "travel"
                      ? "Narrative of the trip. Use Travel details above for destination, itinerary, tips, and packing."
                      : "Optional freeform text. Prefer case-study sections below when the post is a project write-up."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-violet-200 disabled:opacity-40"
                    disabled={aiLoading !== null}
                    onClick={() => void runAssist("polish", { replaceBody: true })}
                  >
                    {isAiBusy("polish") ? "…" : "✦ Polish"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-violet-200 disabled:opacity-40"
                    disabled={aiLoading !== null}
                    onClick={() => void runAssist("fix", { replaceBody: true })}
                  >
                    {isAiBusy("fix") ? "…" : "✦ Fix"}
                  </button>
                  <AiRegenerateButton
                    loading={isAiBusy("body")}
                    disabled={aiLoading !== null}
                    onClick={regenerate("body")}
                  />
                </div>
              </div>
              <textarea
                value={selected.body}
                onChange={(event) => updateSelected({ body: event.target.value })}
                rows={8}
                placeholder={
                  selected.format === "travel"
                    ? "Tell the story of the trip. Use blank lines between paragraphs."
                    : "Optional additional narrative. Use blank lines between paragraphs."
                }
                className={`${INPUT_CLASS} leading-relaxed`}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-sm text-white/70">Stories</p>
              <p className="mt-1 text-xs text-white/45">
                Stack multiple mini case studies in this post. When stories exist, they replace the
                classic body / case-study / gallery layout on the public page.
              </p>
              <div className="mt-4">
                <StoryChaptersEditor
                  chapters={selected.storyChapters ?? []}
                  pool={selected.galleryImages.map((image, index) => ({
                    id: image.id || `img_${index}`,
                    src: image.url,
                    alt: image.alt || "",
                  }))}
                  onChange={(next) => updateSelected({ storyChapters: next })}
                  onConvertLegacy={() => {
                    updateSelected({
                      storyChapters: [
                        blogPostToChapter({
                          title: selected.title,
                          excerpt: selected.excerpt,
                          body: selected.body,
                          pullQuote: selected.pullQuote,
                          photoCredits: selected.photoCredits,
                          coverImageUrl: selected.coverImageUrl,
                          coverImageAlt: selected.coverImageAlt,
                          galleryBlocks: selected.galleryBlocks,
                          caseBrief: selected.caseStudy.brief,
                          caseProblem: selected.caseStudy.problem,
                          caseSolution: selected.caseStudy.solution,
                        }),
                      ],
                    });
                  }}
                  tone="dark"
                  heroUsesPoolIds
                />
              </div>
            </div>

            <EditorField
              label="Photo credits"
              hint="Optional credit line under the gallery / cover."
              onRegenerate={regenerate("photoCredits")}
              aiLoading={isAiBusy("photoCredits")}
              aiDisabled={aiLoading !== null}
            >
              <input
                value={selected.photoCredits || ""}
                onChange={(event) => updateSelected({ photoCredits: event.target.value })}
                placeholder="Photographs © BRIGHTLINE Photography"
                className={INPUT_CLASS}
              />
            </EditorField>

            <div className="border-t border-white/10 pt-5">
              {(() => {
                const caseStudy = selected.caseStudy ?? blankCaseStudy();
                const isTravel = selected.format === "travel";
                return (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm text-white/70">
                        {isTravel ? "Media sections" : "Case-study sections"}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        {isTravel
                          ? "Gallery and video for this travel story. Destination and itinerary live in Travel details above."
                          : "Turn sections on for project write-ups. Disabled sections stay hidden on the live post."}
                      </p>
                    </div>

                    {!isTravel ? (
                      <>
                    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-[0.16em] text-white/65">
                          Brief project description
                        </span>
                        <div className="flex items-center gap-2">
                          <AiRegenerateButton
                            loading={isAiBusy("caseBrief")}
                            disabled={aiLoading !== null}
                            onClick={regenerate("caseBrief")}
                          />
                          <input
                            type="checkbox"
                            checked={caseStudy.briefEnabled}
                            onChange={(event) => updateCaseStudy({ briefEnabled: event.target.checked })}
                            className="rounded border-white/20"
                            aria-label="Show brief section"
                          />
                        </div>
                      </div>
                      {caseStudy.briefEnabled ? (
                        <textarea
                          value={caseStudy.brief}
                          onChange={(event) => updateCaseStudy({ brief: event.target.value })}
                          rows={3}
                          placeholder="What the project was, who it was for, and the scope in a few sentences."
                          className={`${INPUT_CLASS} leading-relaxed`}
                        />
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-[0.16em] text-white/65">Problem</span>
                        <div className="flex items-center gap-2">
                          <AiRegenerateButton
                            loading={isAiBusy("caseProblem")}
                            disabled={aiLoading !== null}
                            onClick={regenerate("caseProblem")}
                          />
                          <input
                            type="checkbox"
                            checked={caseStudy.problemEnabled}
                            onChange={(event) => updateCaseStudy({ problemEnabled: event.target.checked })}
                            className="rounded border-white/20"
                            aria-label="Show problem section"
                          />
                        </div>
                      </div>
                      {caseStudy.problemEnabled ? (
                        <textarea
                          value={caseStudy.problem}
                          onChange={(event) => updateCaseStudy({ problem: event.target.value })}
                          rows={3}
                          placeholder="What needed solving — constraints, goals, or visual challenge."
                          className={`${INPUT_CLASS} leading-relaxed`}
                        />
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs uppercase tracking-[0.16em] text-white/65">Solution</span>
                        <div className="flex items-center gap-2">
                          <AiRegenerateButton
                            loading={isAiBusy("caseSolution")}
                            disabled={aiLoading !== null}
                            onClick={regenerate("caseSolution")}
                          />
                          <input
                            type="checkbox"
                            checked={caseStudy.solutionEnabled}
                            onChange={(event) => updateCaseStudy({ solutionEnabled: event.target.checked })}
                            className="rounded border-white/20"
                            aria-label="Show solution section"
                          />
                        </div>
                      </div>
                      {caseStudy.solutionEnabled ? (
                        <textarea
                          value={caseStudy.solution}
                          onChange={(event) => updateCaseStudy({ solution: event.target.value })}
                          rows={3}
                          placeholder="How you approached it — lighting, direction, delivery, or process."
                          className={`${INPUT_CLASS} leading-relaxed`}
                        />
                      ) : null}
                    </div>
                      </>
                    ) : null}

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
                      <label className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-white/65">
                        <span>Gallery section</span>
                        <input
                          type="checkbox"
                          checked={caseStudy.galleryEnabled}
                          onChange={(event) => updateCaseStudy({ galleryEnabled: event.target.checked })}
                          className="rounded border-white/20"
                        />
                      </label>
                      <p className="text-xs text-white/45">
                        When on, gallery images below appear on the public post. Use Gallery layout to
                        add carousels and grids over the same image pool.
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Videos</p>
                        <p className="mt-1 text-xs text-white/45">
                          Add Instagram, YouTube, and/or R2 uploads. Drag to reorder. Instagram
                          appears as a dark card that opens Instagram (no white embed frame).
                          Blocked YouTube embeds become a thumbnail + Watch on YouTube link.
                        </p>
                      </div>

                      <div className="space-y-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-violet-200/90">
                            AI video (image → clip)
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            Optional short (~5s) clip via fal.ai. When ready it is added to the video list.
                          </p>
                        </div>
                        <EditorField label="Source still" hint="Cover, a gallery image, or paste a URL.">
                          <select
                            className={INPUT_CLASS}
                            value={
                              caseStudy.aiVideoSourceUrl ||
                              selected.coverImageUrl ||
                              selected.galleryImages[0]?.url ||
                              ""
                            }
                            onChange={(event) =>
                              updateCaseStudy({ aiVideoSourceUrl: event.target.value })
                            }
                          >
                            <option value="">Select source…</option>
                            {selected.coverImageUrl ? (
                              <option value={selected.coverImageUrl}>Cover image</option>
                            ) : null}
                            {selected.galleryImages.map((img, i) => (
                              <option key={img.id || i} value={img.url}>
                                Gallery {i + 1}
                              </option>
                            ))}
                          </select>
                          <input
                            value={caseStudy.aiVideoSourceUrl}
                            onChange={(event) =>
                              updateCaseStudy({ aiVideoSourceUrl: event.target.value })
                            }
                            placeholder="Or paste image URL / R2 key"
                            className={`${MONO_INPUT_CLASS} mt-2`}
                          />
                        </EditorField>
                        <EditorField
                          label="Motion prompt"
                          onRegenerate={regenerate("caseVideoPrompt")}
                          aiLoading={isAiBusy("caseVideoPrompt")}
                          aiDisabled={aiLoading !== null || aiVideoBusy}
                        >
                          <textarea
                            value={caseStudy.aiVideoPrompt}
                            onChange={(event) =>
                              updateCaseStudy({ aiVideoPrompt: event.target.value })
                            }
                            rows={3}
                            className={INPUT_CLASS}
                          />
                        </EditorField>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost text-xs"
                            disabled={aiVideoBusy || aiLoading !== null}
                            onClick={() => void startAiVideoGeneration()}
                          >
                            {aiVideoBusy ? "Working…" : "Generate AI video"}
                          </button>
                          {(caseStudy.aiVideoStatus === "generating" ||
                            caseStudy.aiVideoStatus === "queued") &&
                          !aiVideoBusy ? (
                            <button
                              type="button"
                              className="btn btn-ghost text-xs"
                              onClick={() => {
                                setAiVideoBusy(true);
                                void pollAiVideoUntilDone(selected.id).finally(() =>
                                  setAiVideoBusy(false)
                                );
                              }}
                            >
                              Resume poll
                            </button>
                          ) : null}
                          {caseStudy.aiVideoKey || caseStudy.aiVideoJobId ? (
                            <button
                              type="button"
                              className="btn btn-ghost text-xs"
                              disabled={aiVideoBusy}
                              onClick={() => void clearAiVideo()}
                            >
                              Clear AI video
                            </button>
                          ) : null}
                        </div>
                        {aiVideoMessage ? (
                          <p className="text-xs text-violet-200/80">{aiVideoMessage}</p>
                        ) : null}
                        {caseStudy.aiVideoStatus === "failed" && caseStudy.aiVideoError ? (
                          <p className="text-xs text-red-300">{caseStudy.aiVideoError}</p>
                        ) : null}
                      </div>

                      <BlogVideosEditor
                        videos={selected.videos ?? []}
                        slug={selected.slug}
                        onChange={(videos) => updateSelected({ videos })}
                        posterOptions={[
                          ...(selected.coverImageUrl
                            ? [{ label: "Cover", value: selected.coverImageUrl }]
                            : []),
                          ...selected.galleryImages
                            .filter((img) => img.url?.trim())
                            .map((img, i) => ({
                              label: img.alt?.trim() || `Gallery ${i + 1}`,
                              value: img.url,
                            })),
                        ]}
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/65">
                        Section order
                      </p>
                      <BlogSectionOrderEditor
                        format={selected.format || "journal"}
                        sectionOrder={
                          selected.sectionOrder?.length
                            ? selected.sectionOrder
                            : defaultSectionOrder(selected.format || "journal")
                        }
                        onChange={(sectionOrder) => updateSelected({ sectionOrder })}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            <EditorField
              label="Tags"
              hint="Comma-separated topics."
              onRegenerate={regenerate("tags")}
              aiLoading={isAiBusy("tags")}
              aiDisabled={aiLoading !== null}
            >
              <input
                value={tagsToString(selected.tags)}
                onChange={(event) => updateSelected({ tags: tagsFromString(event.target.value) })}
                placeholder="production, architecture, delivery"
                className={INPUT_CLASS}
              />
            </EditorField>

            <div className="grid gap-5 sm:grid-cols-2">
              <EditorField label="Cover image URL" hint="Choose from R2 or paste a URL.">
                <input
                  value={selected.coverImageUrl}
                  onChange={(event) => updateSelected({ coverImageUrl: event.target.value })}
                  className={MONO_INPUT_CLASS}
                />
                <button type="button" className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55 underline" onClick={() => setR2Target("cover")}>
                  Choose from R2
                </button>
              </EditorField>

              <EditorField
                label="Cover image alt"
                hint="Auto-generated when you add a cover from R2."
                onRegenerate={() => void scanCoverAlt()}
                aiLoading={isAiBusy("coverAlt") || altScanning?.type === "cover"}
                aiDisabled={aiLoading !== null || altScanning !== null}
              >
                <input
                  value={selected.coverImageAlt}
                  onChange={(event) => updateSelected({ coverImageAlt: event.target.value })}
                  className={INPUT_CLASS}
                />
              </EditorField>
            </div>

            <GoogleReviewImportPanel
              post={selected}
              onApply={(patch) => updateSelected(patch)}
              onUpdateReview={(googleReview) => updateSelected({ googleReview })}
              onCreateDraft={(draft) => {
                setPosts((current) => [draft, ...current]);
                setSelectedId(draft.id);
              }}
              onRequestLibraryPhotos={(onPicked) => {
                googleReviewPhotoPickerRef.current = onPicked;
                setR2Target("googleReviewLibrary");
              }}
            />

            <div className="border-t border-white/10 pt-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-white/70">Gallery images</p>
                  <p className="mt-1 text-xs text-white/50">
                    Shared image pool. Add from R2 or Google review — AI scans alts, then fills excerpt/tags/SEO.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selected.galleryImages.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      disabled={aiLoading !== null || altScanning !== null}
                      onClick={() => void scanGalleryAlts()}
                    >
                      {altScanning?.type === "gallery" || isAiBusy("imageMeta")
                        ? "Scanning…"
                        : "✦ Scan & fill meta"}
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-ghost text-xs" onClick={() => setR2Target("gallery")}>
                    Add from R2
                  </button>
                </div>
              </div>
              {selected.caseStudy.galleryEnabled ? (
                <div className="mb-5 rounded-xl border border-white/10 bg-black/25 p-4">
                  <GalleryBlocksEditor
                    blocks={selected.galleryBlocks ?? []}
                    pool={selected.galleryImages.map((image, index) => ({
                      id: image.id || `img_${index}`,
                      src: image.url,
                      alt: image.alt || "",
                    }))}
                    onChange={(next) => {
                      updateSelected({
                        galleryBlocks: next,
                        caseStudy: {
                          ...selected.caseStudy,
                          galleryCarouselEnabled: next.some((b) => b.type === "carousel"),
                        },
                      });
                    }}
                    tone="dark"
                  />
                  {selected.galleryBlocks.length === 0 && selected.galleryImages.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-ghost mt-3 text-xs"
                      onClick={() =>
                        updateSelected({
                          galleryBlocks: [blankGalleryBlock("carousel"), blankGalleryBlock("grid")],
                        })
                      }
                    >
                      Quick add: carousel + grid (all images)
                    </button>
                  ) : null}
                </div>
              ) : null}
              {selected.galleryImages.length === 0 ? (
                <p className="text-xs text-white/45">No gallery images yet.</p>
              ) : (
                <div className="space-y-3">
                  {selected.galleryImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 md:grid-cols-[72px_1fr_auto]"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <input
                          value={image.url}
                          onChange={(event) => updateGalleryImage(index, { url: event.target.value })}
                          placeholder="Image URL"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                        />
                        <input
                          value={image.alt}
                          onChange={(event) => updateGalleryImage(index, { alt: event.target.value })}
                          placeholder={altScanning?.type === "gallery" && !image.alt ? "Scanning…" : "Alt text"}
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                        <button
                          type="button"
                          className="text-[0.62rem] uppercase tracking-[0.14em] text-violet-200/80 underline disabled:opacity-40"
                          disabled={!image.url.trim() || aiLoading !== null || altScanning !== null}
                          onClick={() => void scanGalleryAlts([index])}
                        >
                          ✦ Scan image
                        </button>
                      </div>
                      <div className="flex flex-col gap-2 text-xs text-white/55">
                        <button type="button" className="underline disabled:opacity-30" disabled={index === 0} onClick={() => moveGalleryImage(index, -1)}>
                          Up
                        </button>
                        <button
                          type="button"
                          className="underline disabled:opacity-30"
                          disabled={index === selected.galleryImages.length - 1}
                          onClick={() => moveGalleryImage(index, 1)}
                        >
                          Down
                        </button>
                        <button type="button" className="text-red-300/80 underline hover:text-red-200" onClick={() => removeGalleryImage(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-5">
              {(() => {
                const beforeAfter = selected.beforeAfter ?? blankBeforeAfter();
                return (
                  <div>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-white/70">Before / after slider</p>
                        <p className="mt-1 text-xs text-white/50">
                          Optional comparison section for retouching, styling, or renovation posts. Drag to reveal.
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/65">
                        <input
                          type="checkbox"
                          checked={beforeAfter.enabled}
                          onChange={(event) => updateBeforeAfter({ enabled: event.target.checked })}
                          className="rounded border-white/20"
                        />
                        Enable
                      </label>
                    </div>

                    {beforeAfter.enabled ? (
                      <div className="space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <EditorField label="Before label">
                            <input
                              value={beforeAfter.beforeLabel}
                              onChange={(event) => updateBeforeAfter({ beforeLabel: event.target.value })}
                              placeholder="Before"
                              className={INPUT_CLASS}
                            />
                          </EditorField>
                          <EditorField label="After label">
                            <input
                              value={beforeAfter.afterLabel}
                              onChange={(event) => updateBeforeAfter({ afterLabel: event.target.value })}
                              placeholder="After"
                              className={INPUT_CLASS}
                            />
                          </EditorField>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="space-y-3">
                            <EditorField label="Before image" hint="Choose from R2 or paste a URL.">
                              <input
                                value={beforeAfter.beforeImageUrl}
                                onChange={(event) =>
                                  updateBeforeAfter({ beforeImageUrl: event.target.value })
                                }
                                className={MONO_INPUT_CLASS}
                              />
                              <button
                                type="button"
                                className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55 underline"
                                onClick={() => setR2Target("before")}
                              >
                                Choose from R2
                              </button>
                            </EditorField>
                            <EditorField
                              label="Before image alt"
                              hint="Vision AI describes the before frame."
                              onRegenerate={() => void scanBeforeAfterAlt("before")}
                              aiLoading={altScanning?.type === "before"}
                              aiDisabled={
                                aiLoading !== null ||
                                altScanning !== null ||
                                !beforeAfter.beforeImageUrl.trim()
                              }
                            >
                              <input
                                value={beforeAfter.beforeImageAlt}
                                onChange={(event) =>
                                  updateBeforeAfter({ beforeImageAlt: event.target.value })
                                }
                                placeholder="Alt text"
                                className={INPUT_CLASS}
                              />
                            </EditorField>
                          </div>

                          <div className="space-y-3">
                            <EditorField label="After image" hint="Choose from R2 or paste a URL.">
                              <input
                                value={beforeAfter.afterImageUrl}
                                onChange={(event) =>
                                  updateBeforeAfter({ afterImageUrl: event.target.value })
                                }
                                className={MONO_INPUT_CLASS}
                              />
                              <button
                                type="button"
                                className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55 underline"
                                onClick={() => setR2Target("after")}
                              >
                                Choose from R2
                              </button>
                            </EditorField>
                            <EditorField
                              label="After image alt"
                              hint="Vision AI describes the after frame."
                              onRegenerate={() => void scanBeforeAfterAlt("after")}
                              aiLoading={altScanning?.type === "after"}
                              aiDisabled={
                                aiLoading !== null ||
                                altScanning !== null ||
                                !beforeAfter.afterImageUrl.trim()
                              }
                            >
                              <input
                                value={beforeAfter.afterImageAlt}
                                onChange={(event) =>
                                  updateBeforeAfter({ afterImageAlt: event.target.value })
                                }
                                placeholder="Alt text"
                                className={INPUT_CLASS}
                              />
                            </EditorField>
                          </div>
                        </div>

                        <EditorField label="Caption" hint="Optional line under the slider.">
                          <input
                            value={beforeAfter.caption}
                            onChange={(event) => updateBeforeAfter({ caption: event.target.value })}
                            placeholder="Stylize · Interior presets like Velvet and Sunbathed."
                            className={INPUT_CLASS}
                          />
                        </EditorField>

                        <EditorField label="Placement">
                          <select
                            value={beforeAfter.placement}
                            onChange={(event) =>
                              updateBeforeAfter({
                                placement: event.target.value as BlogBeforeAfterPlacement,
                              })
                            }
                            className={INPUT_CLASS}
                          >
                            <option value="afterCover">After cover image</option>
                            <option value="afterBody">After body text</option>
                            <option value="afterGallery">After gallery</option>
                          </select>
                        </EditorField>

                        {beforeAfter.beforeImageUrl && beforeAfter.afterImageUrl ? (
                          <div>
                            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">
                              Preview
                            </p>
                            <BeforeAfterSlider section={beforeAfter} />
                          </div>
                        ) : (
                          <p className="text-xs text-white/45">
                            Add both before and after images to preview the slider.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 border-t border-white/10 pt-5">
              <EditorField
                label="SEO title"
                onRegenerate={regenerate("seoTitle")}
                aiLoading={isAiBusy("seoTitle")}
                aiDisabled={aiLoading !== null}
              >
                <input
                  value={selected.seoTitle}
                  onChange={(event) => updateSelected({ seoTitle: event.target.value })}
                  className={INPUT_CLASS}
                />
              </EditorField>

              <EditorField
                label="SEO description"
                onRegenerate={regenerate("seoDescription")}
                aiLoading={isAiBusy("seoDescription")}
                aiDisabled={aiLoading !== null}
              >
                <input
                  value={selected.seoDescription}
                  onChange={(event) => updateSelected({ seoDescription: event.target.value })}
                  className={INPUT_CLASS}
                />
              </EditorField>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <button type="button" className="text-xs text-red-300/80 underline hover:text-red-200" onClick={deletePost}>
                Delete post
              </button>
            </div>
          </section>
        </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-white/55">
            Select a post from the list, or open Shared for Studio CMS hub blogs.
          </div>
        )}
      </div>
    </div>
  );
}
