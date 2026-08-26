import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import {
  blankBlogPost,
  blankCaseStudy,
  type BlogGalleryImage,
} from "@/lib/blog-post-model";
import { getBlogPosts, saveBlogPosts, slugifyBlog } from "@/lib/blog-posts";
import { getPresetForPillar } from "@/lib/media-kit/presets";
import { runMediaKitPack } from "@/lib/media-kit/pack";
import { getPublicR2Url } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { enrichStudioProjectWithGalleryMedia } from "@/lib/studio/studio-project-cms";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Create a draft journal post from a Studio/Work project; optional media pack. */
export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "media-kit-from-work", max: 10, windowMs: 60 * 60_000 })) {
    return jsonErr("Too many Work→Journal requests. Try again later.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;
  const body = raw.value as Record<string, unknown>;
  const projectId = cleanString(body.projectId);
  const runPack = body.runPack === true;
  if (!projectId) return jsonErr("projectId is required.", 400);

  const project = await prisma.studioProject.findUnique({
    where: { id: projectId },
    include: { heroImage: true },
  });
  if (!project) return jsonErr("Work project not found.", 404);

  const enriched = await enrichStudioProjectWithGalleryMedia(project);
  const heroKey =
    enriched.heroImage?.keyFull ||
    enriched.heroImage?.keyThumb ||
    enriched.galleryMedia[0]?.media?.keyFull ||
    "";
  const coverImageUrl = heroKey ? getPublicR2Url(heroKey) : "";
  const galleryImages: BlogGalleryImage[] = enriched.galleryMedia
    .map((g) => {
      const key = g.media?.keyFull || g.media?.keyThumb || "";
      if (!key) return null;
      return {
        id: g.mediaId || g.media?.id || `img_${Math.random().toString(36).slice(2, 9)}`,
        url: getPublicR2Url(key),
        alt: g.media?.alt || project.title || "",
      };
    })
    .filter((g): g is BlogGalleryImage => Boolean(g))
    .slice(0, 24);

  const preset = await getPresetForPillar(project.pillar);
  const title = project.title?.trim() || "Untitled project";
  const bodyParts = [
    project.opening,
    project.context,
    project.approach,
    project.highlight,
    project.execution,
    project.closing,
    project.summary,
  ]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);

  const post = blankBlogPost(title);
  post.slug = slugifyBlog(title) || post.slug;
  post.excerpt = (project.summary || project.opening || "").trim().slice(0, 400);
  post.body = bodyParts.join("\n\n");
  post.coverImageUrl = coverImageUrl;
  post.coverImageAlt = project.heroImage?.alt || title;
  post.galleryImages = galleryImages;
  post.tags = [...(project.tags || []), project.pillar, project.location]
    .filter(Boolean)
    .map(String)
    .slice(0, 12);
  post.seoTitle = project.seoTitle || "";
  post.seoDescription = project.seoDescription || "";
  post.mediaKitPresetId = preset.id;
  post.linkedWorkProjectId = project.id;
  post.linkedWorkSlug = [project.pillar, project.slug].filter(Boolean).join("/");
  post.caseStudy = {
    ...blankCaseStudy(),
    briefEnabled: Boolean(post.excerpt),
    brief: post.excerpt,
    problemEnabled: Boolean(project.context?.trim()),
    problem: (project.context || "").trim().slice(0, 900),
    solutionEnabled: Boolean(project.approach?.trim() || project.execution?.trim()),
    solution: [project.approach, project.execution].filter(Boolean).join("\n\n").slice(0, 900),
    galleryEnabled: galleryImages.length > 0,
  };
  post.status = "DRAFT";
  post.showInJournal = true;
  post.featureOnHome = false;
  post.featureInCaseStudies = Boolean(
    post.caseStudy.briefEnabled || post.caseStudy.problemEnabled || post.caseStudy.solutionEnabled
  );

  const existing = await getBlogPosts();
  let slug = post.slug;
  let n = 2;
  while (existing.some((p) => p.slug === slug)) {
    slug = `${post.slug}-${n}`;
    n += 1;
  }
  post.slug = slug;

  if (runPack && coverImageUrl) {
    try {
      const origin = new URL(req.url).origin;
      const pack = await runMediaKitPack({
        source: "blog",
        entityId: post.id,
        sourceImageUrl: coverImageUrl,
        presetId: preset.id,
        origin,
        title: post.title,
        excerpt: post.excerpt,
        tags: post.tags,
        slug: post.slug,
      });
      post.socialImages = { feedUrl: pack.feedUrl, storyUrl: pack.storyUrl };
      post.shareCaptions = pack.shareCaptions;
      if (pack.videoKey) {
        post.caseStudy.videoEnabled = true;
        post.caseStudy.aiVideoKey = pack.videoKey;
        post.caseStudy.aiVideoStatus = "ready";
        post.caseStudy.aiVideoSourceUrl = coverImageUrl;
        post.caseStudy.aiVideoPrompt = pack.motionPrompt;
      }
    } catch (err) {
      console.warn("FROM_WORK_PACK_SKIPPED", err);
    }
  }

  await saveBlogPosts([...existing, post]);

  return NextResponse.json({
    ok: true,
    post,
    blogAdminUrl: `/admin/blog`,
  });
}
