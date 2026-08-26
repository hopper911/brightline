import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { blankCaseStudy, blankSocialImages } from "@/lib/blog-post-model";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { runMediaKitBatch } from "@/lib/media-kit/pack";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Batch media packs from gallery stills (first still gets AI video). */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "media-kit-batch", max: 6, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many batch media requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;
  const body = raw.value as Record<string, unknown>;

  const postId = cleanString(body.postId) || cleanString(body.entityId);
  const presetId = cleanString(body.presetId) || "editorial";
  const skipVideo = body.skipVideo === true;
  if (!postId) return jsonErr("postId is required.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;

  const urlsFromBody = Array.isArray(body.sourceImageUrls)
    ? body.sourceImageUrls.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean)
    : [];
  const sourceImageUrls =
    urlsFromBody.length > 0
      ? urlsFromBody
      : [
          post.coverImageUrl,
          ...post.galleryImages.map((g) => g.url),
        ].filter(Boolean);

  if (sourceImageUrls.length === 0) {
    return jsonErr("Add a cover or gallery images before running batch.", 400);
  }

  try {
    const origin = new URL(req.url).origin;
    const { primary, extras } = await runMediaKitBatch({
      source: "blog",
      entityId: post.id,
      sourceImageUrls,
      presetId,
      origin,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags,
      slug: post.slug,
      videoOnFirstOnly: true,
      skipVideo,
    });

    const caseStudy = { ...(post.caseStudy ?? blankCaseStudy()) };
    if (primary.videoKey) {
      caseStudy.videoEnabled = true;
      caseStudy.aiVideoKey = primary.videoKey;
      caseStudy.aiVideoStatus = "ready";
      caseStudy.aiVideoSourceUrl = sourceImageUrls[0] || "";
      caseStudy.aiVideoPrompt = primary.motionPrompt;
      caseStudy.aiVideoError = "";
      caseStudy.aiVideoJobId = "";
    }

    const next = {
      ...post,
      mediaKitPresetId: primary.presetId,
      socialImages: {
        ...(post.socialImages ?? blankSocialImages()),
        feedUrl: primary.feedUrl,
        storyUrl: primary.storyUrl,
      },
      shareCaptions: primary.shareCaptions,
      mediaKitAssets: [
        {
          sourceUrl: sourceImageUrls[0] || "",
          videoKey: primary.videoKey,
          feedUrl: primary.feedUrl,
          storyUrl: primary.storyUrl,
        },
        ...extras,
      ],
      caseStudy,
      updatedAt: new Date().toISOString(),
    };
    posts[index] = next;
    await saveBlogPosts(posts);

    return NextResponse.json({
      ok: true,
      primary,
      extras,
      post: next,
      warning: primary.videoWarning || undefined,
    });
  } catch (err: unknown) {
    console.error("MEDIA_KIT_BATCH_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Batch media pack failed.";
    return jsonErr(message, status);
  }
}
