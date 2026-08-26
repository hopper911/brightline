import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { blankCaseStudy, blankSocialImages } from "@/lib/blog-post-model";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { runMediaKitPack } from "@/lib/media-kit/pack";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** One-click media pack for a blog post (crops + optional AI video + captions). */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "media-kit-pack", max: 12, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many media pack requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;
  const body = raw.value as Record<string, unknown>;

  const postId = cleanString(body.postId) || cleanString(body.entityId);
  const sourceImageUrl = cleanString(body.sourceImageUrl);
  const presetId = cleanString(body.presetId) || "editorial";
  const skipVideo = body.skipVideo === true;

  if (!postId) return jsonErr("postId is required.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;

  const source =
    sourceImageUrl ||
    post.coverImageUrl ||
    post.galleryImages[0]?.url ||
    "";
  if (!source) return jsonErr("sourceImageUrl or post cover is required.", 400);

  try {
    const origin = new URL(req.url).origin;
    const pack = await runMediaKitPack({
      source: "blog",
      entityId: post.id,
      sourceImageUrl: source,
      presetId,
      origin,
      title: post.title,
      excerpt: post.excerpt,
      tags: post.tags,
      slug: post.slug,
      skipVideo,
    });

    const caseStudy = { ...(post.caseStudy ?? blankCaseStudy()) };
    if (pack.videoKey) {
      caseStudy.videoEnabled = true;
      caseStudy.aiVideoKey = pack.videoKey;
      caseStudy.aiVideoStatus = "ready";
      caseStudy.aiVideoSourceUrl = source;
      caseStudy.aiVideoPrompt = pack.motionPrompt;
      caseStudy.aiVideoError = "";
      caseStudy.aiVideoJobId = "";
    }

    const next = {
      ...post,
      mediaKitPresetId: pack.presetId,
      socialImages: {
        ...(post.socialImages ?? blankSocialImages()),
        feedUrl: pack.feedUrl,
        storyUrl: pack.storyUrl,
      },
      shareCaptions: pack.shareCaptions,
      mediaKitAssets: [
        {
          sourceUrl: source,
          videoKey: pack.videoKey,
          feedUrl: pack.feedUrl,
          storyUrl: pack.storyUrl,
        },
      ],
      caseStudy,
      updatedAt: new Date().toISOString(),
    };
    posts[index] = next;
    await saveBlogPosts(posts);

    return NextResponse.json({
      ok: true,
      pack,
      post: next,
      warning: pack.videoWarning || undefined,
    });
  } catch (err: unknown) {
    console.error("MEDIA_KIT_PACK_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Media pack failed.";
    return jsonErr(message, status);
  }
}
