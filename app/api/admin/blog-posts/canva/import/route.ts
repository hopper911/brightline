import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { importCanvaDesignToR2 } from "@/lib/canva/blog-designs";
import type { CanvaDesignSize } from "@/lib/canva/client";
import { isCanvaConfigured, isCanvaConnected } from "@/lib/canva/oauth";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_SIZES = new Set<CanvaDesignSize>(["cover", "feed", "story"]);

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Export a Canva design and store JPG on R2; update cover or socialImages. */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  if (!isCanvaConfigured()) {
    return jsonErr("Canva is not configured. Add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET.", 503);
  }
  if (!(await isCanvaConnected())) {
    return jsonErr("Connect Canva first (Admin → Blog → Canva).", 401);
  }

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "blog-canva-import", max: 30, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many Canva import requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const body = raw.value as Record<string, unknown>;
  const postId = cleanString(body.postId);
  const size = cleanString(body.size) as CanvaDesignSize;
  if (!postId) return jsonErr("postId is required.", 400);
  if (!VALID_SIZES.has(size)) return jsonErr("size must be cover, feed, or story.", 400);

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.id === postId);
  if (index < 0) return jsonErr("Post not found.", 404);
  const post = posts[index]!;

  try {
    const { key, patch } = await importCanvaDesignToR2({ post, size });
    const next = { ...post, ...patch };
    posts[index] = next;
    await saveBlogPosts(posts);

    return NextResponse.json({ ok: true, key, size, post: next });
  } catch (err: unknown) {
    console.error("BLOG_CANVA_IMPORT_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Failed to import Canva design.";
    return jsonErr(message, status);
  }
}
