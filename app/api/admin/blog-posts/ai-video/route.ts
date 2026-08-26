import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import {
  pollAndStoreBlogAiVideo,
  patchCaseStudyAiVideo,
  submitBlogAiVideoJob,
} from "@/lib/ai/generateBlogAiVideo";
import { isFalConfigured } from "@/lib/ai/fal-client";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Start an image-to-video job for a blog post. */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  if (!isFalConfigured()) {
    return jsonErr("AI video is not configured. Add FAL_KEY in environment variables.", 503);
  }

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "blog-ai-video", max: 8, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many AI video requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const body = raw.value as Record<string, unknown>;
  const postId = cleanString(body.postId);
  const sourceImageUrl = cleanString(body.sourceImageUrl);
  const prompt = cleanString(body.prompt);

  if (!postId) return jsonErr("postId is required.", 400);
  if (!sourceImageUrl) return jsonErr("sourceImageUrl is required.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;

  // Per-post soft limit: 3 generations / hour (tracked via recent job timestamps in error field is weak —
  // use IP rate limit above + confirm in UI).
  if (
    await isRateLimitedAsync(`post:${postId}`, {
      scope: "blog-ai-video-post",
      max: 3,
      windowMs: 60 * 60_000,
    })
  ) {
    return jsonErr("This post already started 3 AI videos in the last hour.", 429);
  }

  try {
    const origin = new URL(req.url).origin;
    const { requestId } = await submitBlogAiVideoJob({
      sourceImageUrl,
      prompt,
      origin,
    });

    const next = patchCaseStudyAiVideo(post, {
      aiVideoSourceUrl: sourceImageUrl,
      aiVideoPrompt: prompt,
      aiVideoStatus: "generating",
      aiVideoJobId: requestId,
      aiVideoError: "",
      // Keep prior key until replacement succeeds
    });
    posts[index] = next;
    await saveBlogPosts(posts);

    return NextResponse.json({
      ok: true,
      status: next.caseStudy.aiVideoStatus,
      jobId: requestId,
      post: next,
    });
  } catch (err: unknown) {
    console.error("BLOG_AI_VIDEO_SUBMIT_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Failed to start AI video.";
    return jsonErr(message, status);
  }
}

/** Poll fal job; when complete, store MP4 on R2 and update the post. */
export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const postId = url.searchParams.get("postId")?.trim() || "";
  if (!postId) return jsonErr("postId is required.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;
  const cs = post.caseStudy;

  if (cs.aiVideoStatus === "ready" && cs.aiVideoKey) {
    return NextResponse.json({
      ok: true,
      status: "ready",
      key: cs.aiVideoKey,
      post,
    });
  }

  if (!cs.aiVideoJobId) {
    return NextResponse.json({
      ok: true,
      status: cs.aiVideoStatus || "idle",
      post,
    });
  }

  if (!isFalConfigured()) {
    return jsonErr("AI video is not configured. Add FAL_KEY in environment variables.", 503);
  }

  try {
    const result = await pollAndStoreBlogAiVideo({
      requestId: cs.aiVideoJobId,
      slug: post.slug,
    });

    if (result.state === "pending") {
      const next = patchCaseStudyAiVideo(post, {
        aiVideoStatus: result.status === "IN_QUEUE" ? "queued" : "generating",
      });
      posts[index] = next;
      await saveBlogPosts(posts);
      return NextResponse.json({
        ok: true,
        status: next.caseStudy.aiVideoStatus,
        falStatus: result.status,
        post: next,
      });
    }

    if (result.state === "failed") {
      const next = patchCaseStudyAiVideo(post, {
        aiVideoStatus: "failed",
        aiVideoError: result.error,
      });
      posts[index] = next;
      await saveBlogPosts(posts);
      return NextResponse.json({
        ok: false,
        status: "failed",
        error: result.error,
        post: next,
      });
    }

    const next = patchCaseStudyAiVideo(post, {
      aiVideoStatus: "ready",
      aiVideoKey: result.key,
      aiVideoError: "",
      videoEnabled: true,
    });
    posts[index] = next;
    await saveBlogPosts(posts);

    return NextResponse.json({
      ok: true,
      status: "ready",
      key: result.key,
      post: next,
    });
  } catch (err: unknown) {
    console.error("BLOG_AI_VIDEO_POLL_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to poll AI video.";
    const next = patchCaseStudyAiVideo(post, {
      aiVideoStatus: "failed",
      aiVideoError: message,
    });
    posts[index] = next;
    try {
      await saveBlogPosts(posts);
    } catch {
      // ignore secondary save failure
    }
    return jsonErr(message, 500);
  }
}

/** Clear generated AI video fields (keeps YouTube fields). */
export async function DELETE(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const postId = url.searchParams.get("postId")?.trim() || "";
  if (!postId) return jsonErr("postId is required.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;

  const next = patchCaseStudyAiVideo(post, {
    aiVideoStatus: "idle",
    aiVideoJobId: "",
    aiVideoKey: "",
    aiVideoError: "",
  });
  posts[index] = next;
  await saveBlogPosts(posts);

  return NextResponse.json({ ok: true, post: next });
}
