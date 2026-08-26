import {
  FAL_IMAGE_TO_VIDEO_MODEL,
  extractFalVideoUrl,
  falQueueResult,
  falQueueStatus,
  falQueueSubmit,
  isFalConfigured,
} from "@/lib/ai/fal-client";
import { putObjectBuffer } from "@/lib/storage-r2";
import type { BlogCaseStudySections, BlogPost, BlogPostVideo } from "@/lib/blog-post-model";
import { blankCaseStudy } from "@/lib/blog-post-model";
import { isTrustedR2Host } from "@/lib/r2";
import { FAL_DOWNLOAD_HOST_SUFFIXES, fetchPublicUrlBytes } from "@/lib/safe-fetch-url";

function sanitizeSlug(slug: string) {
  return slug.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "post";
}

/** Make a publicly fetchable absolute URL for fal (needs HTTPS) — trusted hosts only. */
export function resolveAbsoluteMediaUrl(input: string, origin: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Source image URL is required."), { status: 400 });
  }

  let absolute: string;
  if (/^https?:\/\//i.test(trimmed)) {
    absolute = trimmed;
  } else if (trimmed.startsWith("/")) {
    absolute = `${origin.replace(/\/$/, "")}${trimmed}`;
  } else {
    const key = trimmed.replace(/^\/+/, "");
    absolute = `${origin.replace(/\/$/, "")}/api/media/public?key=${encodeURIComponent(key)}`;
  }

  let url: URL;
  try {
    url = new URL(absolute);
  } catch {
    throw Object.assign(new Error("Invalid source image URL."), { status: 400 });
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw Object.assign(new Error("Invalid source image URL."), { status: 400 });
  }

  let originHost = "";
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    originHost = "";
  }

  const host = url.hostname.toLowerCase();
  const allowed =
    (originHost && host === originHost) ||
    host === "brightlinephotography.com" ||
    host.endsWith(".brightlinephotography.com") ||
    host.endsWith(".vercel.app") ||
    isTrustedR2Host(host) ||
    ((host === "localhost" || host === "127.0.0.1") &&
      (originHost === "localhost" || originHost === "127.0.0.1"));

  if (!allowed) {
    throw Object.assign(new Error("Source image host is not allowed."), { status: 400 });
  }

  return url.toString();
}

export function assertFalReady() {
  if (!isFalConfigured()) {
    throw Object.assign(
      new Error("AI video is not configured. Add FAL_KEY in environment variables."),
      { status: 503 }
    );
  }
}

export async function submitBlogAiVideoJob(options: {
  sourceImageUrl: string;
  prompt: string;
  origin: string;
}): Promise<{ requestId: string; modelId: string }> {
  assertFalReady();
  const imageUrl = resolveAbsoluteMediaUrl(options.sourceImageUrl, options.origin);
  const prompt =
    options.prompt.trim() ||
    "Subtle cinematic camera drift, natural light, premium photography motion, calm and elegant.";

  const { requestId } = await falQueueSubmit(FAL_IMAGE_TO_VIDEO_MODEL, {
    start_image_url: imageUrl,
    prompt,
    duration: "5",
    negative_prompt: "blurry, distorted, watermark, text overlay, low quality",
  });

  return { requestId, modelId: FAL_IMAGE_TO_VIDEO_MODEL };
}

export type PollBlogAiVideoResult =
  | { state: "pending"; status: string }
  | { state: "failed"; error: string }
  | { state: "ready"; key: string };

export async function pollAndStoreBlogAiVideo(options: {
  requestId: string;
  slug: string;
}): Promise<PollBlogAiVideoResult> {
  assertFalReady();
  const modelId = FAL_IMAGE_TO_VIDEO_MODEL;
  const { status } = await falQueueStatus(modelId, options.requestId);

  if (status === "IN_QUEUE" || status === "IN_PROGRESS") {
    return { state: "pending", status };
  }

  if (status !== "COMPLETED") {
    return {
      state: "failed",
      error: `Video generation ended with status ${status}.`,
    };
  }

  const result = await falQueueResult(modelId, options.requestId);
  const videoUrl = extractFalVideoUrl(result);
  if (!videoUrl) {
    return { state: "failed", error: "fal completed but returned no video URL." };
  }

  let upstreamBytes: Buffer;
  let contentType = "video/mp4";
  try {
    const downloaded = await fetchPublicUrlBytes(videoUrl, {
      maxBytes: 80 * 1024 * 1024,
      allowedHostSuffixes: FAL_DOWNLOAD_HOST_SUFFIXES,
      accept: "video/*,*/*;q=0.8",
    });
    upstreamBytes = downloaded.bytes;
    contentType = downloaded.contentType.includes("video")
      ? downloaded.contentType
      : "video/mp4";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return { state: "failed", error: `Could not download generated video: ${msg}` };
  }
  if (upstreamBytes.byteLength < 1000) {
    return { state: "failed", error: "Downloaded video file was empty." };
  }

  const key = `site/blog/${sanitizeSlug(options.slug)}/ai-video-${Date.now()}.mp4`;
  await putObjectBuffer({
    key,
    body: upstreamBytes,
    contentType,
    access: "private",
  });

  return { state: "ready", key };
}

export function patchCaseStudyAiVideo(
  post: BlogPost,
  patch: Partial<BlogCaseStudySections>
): BlogPost {
  const current = post.caseStudy ?? blankCaseStudy();
  const caseStudy = {
    ...current,
    ...patch,
    videoEnabled: true,
  };

  const videos = [...(post.videos ?? [])];
  const aiIdx = videos.findIndex((v) => v.provider === "ai");
  const nextAi: BlogPostVideo = {
    id: aiIdx >= 0 ? videos[aiIdx]!.id : `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    provider: "ai",
    url: "",
    r2Key: caseStudy.aiVideoKey || (aiIdx >= 0 ? videos[aiIdx]!.r2Key : ""),
    posterUrl:
      caseStudy.videoPosterUrl ||
      caseStudy.aiVideoSourceUrl ||
      (aiIdx >= 0 ? videos[aiIdx]!.posterUrl : ""),
    caption: caseStudy.videoCaption || (aiIdx >= 0 ? videos[aiIdx]!.caption : ""),
  };

  if (caseStudy.aiVideoStatus === "ready" && nextAi.r2Key) {
    if (aiIdx >= 0) videos[aiIdx] = nextAi;
    else videos.unshift(nextAi);
  } else if (aiIdx >= 0 && caseStudy.aiVideoStatus === "failed") {
    // Keep slot but clear key so it does not render until regenerated.
    videos[aiIdx] = { ...nextAi, r2Key: "" };
  }

  return {
    ...post,
    caseStudy,
    videos,
    updatedAt: new Date().toISOString(),
  };
}
