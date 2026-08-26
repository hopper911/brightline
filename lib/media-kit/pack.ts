import sharp from "sharp";
import {
  FAL_IMAGE_TO_VIDEO_MODEL,
  extractFalVideoUrl,
  falQueueResult,
  falQueueStatus,
  falQueueSubmit,
  isFalConfigured,
} from "@/lib/ai/fal-client";
import { resolveAbsoluteMediaUrl } from "@/lib/ai/generateBlogAiVideo";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient, resolveOpenAiChatModel } from "@/lib/ai/runtime";
import {
  getMediaKitPresetById,
  sharpPositionForCrop,
  type MediaKitPreset,
} from "@/lib/media-kit/presets";
import { putMediaKitObject, type MediaKitSource } from "@/lib/media-kit/storage";
import type { BlogShareCaptions } from "@/lib/blog-post-model";
import { blankShareCaptions } from "@/lib/blog-post-model";
import { BRAND, getUrl } from "@/lib/config/brand";
import { FAL_DOWNLOAD_HOST_SUFFIXES, fetchPublicUrlBytes } from "@/lib/safe-fetch-url";

async function fetchImageBytes(url: string, origin: string): Promise<Buffer> {
  const { fetchTrustedImageBytes } = await import("@/lib/safe-fetch-image");
  return fetchTrustedImageBytes(url, origin);
}

async function cropAndStore(options: {
  bytes: Buffer;
  width: number;
  height: number;
  cropMode: MediaKitPreset["cropMode"];
  source: MediaKitSource;
  entityId: string;
  label: string;
}): Promise<string> {
  const out = await sharp(options.bytes)
    .rotate()
    .resize(options.width, options.height, {
      fit: "cover",
      position: sharpPositionForCrop(options.cropMode),
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return putMediaKitObject({
    source: options.source,
    entityId: options.entityId,
    filename: `${options.label}-${Date.now()}.jpg`,
    body: out,
    contentType: "image/jpeg",
  });
}

async function generateAndStoreVideo(options: {
  sourceImageUrl: string;
  prompt: string;
  negativePrompt: string;
  origin: string;
  source: MediaKitSource;
  entityId: string;
}): Promise<string> {
  if (!isFalConfigured()) {
    throw Object.assign(
      new Error("AI video is not configured. Add FAL_KEY in environment variables."),
      { status: 503 }
    );
  }
  const imageUrl = resolveAbsoluteMediaUrl(options.sourceImageUrl, options.origin);
  const { requestId } = await falQueueSubmit(FAL_IMAGE_TO_VIDEO_MODEL, {
    start_image_url: imageUrl,
    prompt: options.prompt,
    duration: "5",
    negative_prompt: options.negativePrompt,
  });

  for (let i = 0; i < 90; i += 1) {
    await new Promise((r) => setTimeout(r, 4000));
    const { status } = await falQueueStatus(FAL_IMAGE_TO_VIDEO_MODEL, requestId);
    if (status === "IN_QUEUE" || status === "IN_PROGRESS") continue;
    if (status !== "COMPLETED") {
      throw Object.assign(new Error(`Video generation ended with status ${status}.`), {
        status: 502,
      });
    }
    const result = await falQueueResult(FAL_IMAGE_TO_VIDEO_MODEL, requestId);
    const videoUrl = extractFalVideoUrl(result);
    if (!videoUrl) {
      throw Object.assign(new Error("fal completed but returned no video URL."), { status: 502 });
    }
    const downloaded = await fetchPublicUrlBytes(videoUrl, {
      maxBytes: 80 * 1024 * 1024,
      allowedHostSuffixes: FAL_DOWNLOAD_HOST_SUFFIXES,
      accept: "video/*,*/*;q=0.8",
    });
    if (downloaded.bytes.byteLength < 1000) {
      throw Object.assign(new Error("Downloaded video was empty."), { status: 502 });
    }
    return putMediaKitObject({
      source: options.source,
      entityId: options.entityId,
      filename: `ai-video-${Date.now()}.mp4`,
      body: downloaded.bytes,
      contentType: "video/mp4",
    });
  }
  throw Object.assign(new Error("Timed out waiting for AI video."), { status: 504 });
}

export async function generateShareCaptionsWithAi(options: {
  title: string;
  excerpt: string;
  tags: string[];
  slug: string;
  preset: MediaKitPreset;
}): Promise<BlogShareCaptions> {
  const url = getUrl(`/blog/${options.slug}`);
  try {
    const client = createOpenAiClient();
    const model = resolveOpenAiChatModel();
    const completion = await runAiChatCompletion(
      client,
      {
        model,
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You write social captions for ${BRAND.name}. Voice: ${options.preset.captionVoice}
Return JSON only: {"instagram":"...","youtube":"...","tiktok":"..."}.
Instagram: short poetic caption + CTA with URL + hashtags.
YouTube: title-ish first line + description with URL.
TikTok: punchy caption + URL + hashtags. No emoji overload.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              title: options.title,
              excerpt: options.excerpt,
              tags: options.tags,
              url,
            }),
          },
        ],
      },
      {
        promptId: "media-kit-share-captions",
        promptVersion: 1,
        taskType: "blog_social_captions",
        inputSummary: { slug: options.slug, presetId: options.preset.id },
      }
    );
    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] || raw) as Record<string, unknown>;
    return {
      instagram: typeof parsed.instagram === "string" ? parsed.instagram.trim() : "",
      youtube: typeof parsed.youtube === "string" ? parsed.youtube.trim() : "",
      tiktok: typeof parsed.tiktok === "string" ? parsed.tiktok.trim() : "",
    };
  } catch (err) {
    console.warn("MEDIA_KIT_CAPTIONS_FALLBACK", err);
    return blankShareCaptions();
  }
}

export type MediaKitPackResult = {
  videoKey: string;
  feedUrl: string;
  storyUrl: string;
  shareCaptions: BlogShareCaptions;
  presetId: string;
  motionPrompt: string;
  /** Set when AI video was skipped or failed (crops/captions still succeed). */
  videoWarning?: string;
};

/** One-click pack: crops always; video optional (fal); captions if OpenAI. */
export async function runMediaKitPack(options: {
  source: MediaKitSource;
  entityId: string;
  sourceImageUrl: string;
  presetId: string;
  origin: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  slug?: string;
  skipVideo?: boolean;
}): Promise<MediaKitPackResult> {
  const preset = await getMediaKitPresetById(options.presetId);
  const absolute = resolveAbsoluteMediaUrl(options.sourceImageUrl, options.origin);
  const bytes = await fetchImageBytes(absolute, options.origin);

  const [feedUrl, storyUrl] = await Promise.all([
    cropAndStore({
      bytes,
      width: 1080,
      height: 1080,
      cropMode: preset.cropMode,
      source: options.source,
      entityId: options.entityId,
      label: "feed",
    }),
    cropAndStore({
      bytes,
      width: 1080,
      height: 1920,
      cropMode: preset.cropMode,
      source: options.source,
      entityId: options.entityId,
      label: "story",
    }),
  ]);

  let videoKey = "";
  let videoWarning: string | undefined;

  if (options.skipVideo) {
    videoWarning = "AI video skipped — social crops and captions only.";
  } else if (!isFalConfigured()) {
    videoWarning = "AI video skipped — FAL_KEY not configured.";
  } else {
    try {
      videoKey = await generateAndStoreVideo({
        sourceImageUrl: options.sourceImageUrl,
        prompt: preset.motionPrompt,
        negativePrompt: preset.negativePrompt,
        origin: options.origin,
        source: options.source,
        entityId: options.entityId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI video failed.";
      console.warn("MEDIA_KIT_VIDEO_SOFT_FAIL", err);
      videoWarning = `AI video unavailable (${msg}). Feed + story crops were still generated.`;
    }
  }

  const shareCaptions = await generateShareCaptionsWithAi({
    title: options.title || "BRIGHTLINE Journal",
    excerpt: options.excerpt || "",
    tags: options.tags || [],
    slug: options.slug || options.entityId,
    preset,
  });

  return {
    videoKey,
    feedUrl,
    storyUrl,
    shareCaptions,
    presetId: preset.id,
    motionPrompt: preset.motionPrompt,
    videoWarning,
  };
}

export async function runMediaKitBatch(options: {
  source: MediaKitSource;
  entityId: string;
  sourceImageUrls: string[];
  presetId: string;
  origin: string;
  title?: string;
  excerpt?: string;
  tags?: string[];
  slug?: string;
  /** First still gets video; others crops-only to control cost */
  videoOnFirstOnly?: boolean;
  skipVideo?: boolean;
}): Promise<{
  primary: MediaKitPackResult;
  extras: Array<{ sourceUrl: string; videoKey: string; feedUrl: string; storyUrl: string }>;
}> {
  const urls = options.sourceImageUrls.map((u) => u.trim()).filter(Boolean).slice(0, 8);
  if (urls.length === 0) {
    throw Object.assign(new Error("At least one source image is required."), { status: 400 });
  }

  const primary = await runMediaKitPack({
    source: options.source,
    entityId: options.entityId,
    sourceImageUrl: urls[0]!,
    presetId: options.presetId,
    origin: options.origin,
    title: options.title,
    excerpt: options.excerpt,
    tags: options.tags,
    slug: options.slug,
    skipVideo: options.skipVideo === true,
  });

  const extras: Array<{ sourceUrl: string; videoKey: string; feedUrl: string; storyUrl: string }> =
    [];

  for (let i = 1; i < urls.length; i += 1) {
    const url = urls[i]!;
    const pack = await runMediaKitPack({
      source: options.source,
      entityId: options.entityId,
      sourceImageUrl: url,
      presetId: options.presetId,
      origin: options.origin,
      title: options.title,
      excerpt: options.excerpt,
      tags: options.tags,
      slug: options.slug,
      skipVideo: options.skipVideo === true || options.videoOnFirstOnly !== false,
    });
    extras.push({
      sourceUrl: url,
      videoKey: pack.videoKey,
      feedUrl: pack.feedUrl,
      storyUrl: pack.storyUrl,
    });
  }

  return { primary, extras };
}
