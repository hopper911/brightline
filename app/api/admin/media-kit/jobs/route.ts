import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr } from "@/lib/api/http";
import { getBlogPosts } from "@/lib/blog-posts";
import { getMediaKitPresets } from "@/lib/media-kit/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight job/status view: presets + latest pack fields on a blog post. */
export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const entityId = url.searchParams.get("entityId")?.trim() || "";
  const presets = await getMediaKitPresets();

  if (!entityId) {
    return NextResponse.json({ ok: true, presets, job: null });
  }

  const posts = await getBlogPosts();
  const post = posts.find((p) => p.id === entityId);
  if (!post) return jsonErr("Post not found.", 404);

  return NextResponse.json({
    ok: true,
    presets,
    job: {
      entityId: post.id,
      presetId: post.mediaKitPresetId,
      videoKey: post.caseStudy?.aiVideoKey || "",
      feedUrl: post.socialImages?.feedUrl || "",
      storyUrl: post.socialImages?.storyUrl || "",
      assets: post.mediaKitAssets || [],
      updatedAt: post.updatedAt,
    },
  });
}
