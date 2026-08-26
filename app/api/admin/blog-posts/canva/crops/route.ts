import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { generateSocialCropsFromCover } from "@/lib/canva/social-crops";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Generate Instagram feed + story JPGs from the post cover (sharp crop).
 * Works without Canva credentials.
 */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "blog-canva-crops", max: 40, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many social crop requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const body = raw.value as Record<string, unknown>;
  const postId = cleanString(body.postId);
  if (!postId) return jsonErr("postId is required.", 400);

  const sizesRaw = Array.isArray(body.sizes) ? body.sizes : ["feed", "story"];
  const sizes = sizesRaw
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s): s is "feed" | "story" => s === "feed" || s === "story");
  if (sizes.length === 0) return jsonErr("sizes must include feed and/or story.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;

  try {
    const origin = new URL(req.url).origin;
    const { socialImages } = await generateSocialCropsFromCover({
      post,
      sourceImageUrl: cleanString(body.sourceImageUrl) || undefined,
      origin,
      sizes,
    });

    const next = {
      ...post,
      socialImages,
      updatedAt: new Date().toISOString(),
    };
    posts[index] = next;
    await saveBlogPosts(posts);

    return NextResponse.json({ ok: true, socialImages, post: next });
  } catch (err: unknown) {
    console.error("BLOG_SOCIAL_CROPS_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Failed to generate social crops.";
    return jsonErr(message, status);
  }
}
