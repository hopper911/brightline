import sharp from "sharp";
import { putObjectBuffer } from "@/lib/storage-r2";
import { resolveAbsoluteMediaUrl } from "@/lib/ai/generateBlogAiVideo";
import type { BlogPost, BlogSocialImages } from "@/lib/blog-post-model";
import { blankSocialImages } from "@/lib/blog-post-model";
import { CANVA_DESIGN_SIZES, type CanvaDesignSize } from "@/lib/canva/client";
import { fetchTrustedImageBytes } from "@/lib/safe-fetch-image";

function sanitizeSlug(slug: string) {
  return slug.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "post";
}


/** Center-crop + resize to target social size; upload JPG to R2. */
export async function cropSocialFromSource(options: {
  sourceBytes: Buffer;
  size: Exclude<CanvaDesignSize, "cover">;
  slug: string;
}): Promise<string> {
  const dims = CANVA_DESIGN_SIZES[options.size];
  const out = await sharp(options.sourceBytes)
    .rotate()
    .resize(dims.width, dims.height, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const key = `site/blog/${sanitizeSlug(options.slug)}/social-${options.size}-${Date.now()}.jpg`;
  await putObjectBuffer({
    key,
    body: out,
    contentType: "image/jpeg",
    access: "private",
  });
  return key;
}

/**
 * Build Instagram feed + story graphics from the post cover (or provided URL).
 * Does not require Canva — works on Free tier without Connect credentials.
 */
export async function generateSocialCropsFromCover(options: {
  post: BlogPost;
  sourceImageUrl?: string;
  origin: string;
  sizes?: Array<"feed" | "story">;
}): Promise<{ socialImages: BlogSocialImages; keys: Record<string, string> }> {
  const source =
    options.sourceImageUrl?.trim() ||
    options.post.coverImageUrl.trim() ||
    options.post.galleryImages[0]?.url?.trim() ||
    "";
  if (!source) {
    throw Object.assign(
      new Error("Add a cover image (or gallery still) before generating social crops."),
      { status: 400 }
    );
  }

  const absolute = resolveAbsoluteMediaUrl(source, options.origin);
  const bytes = await fetchTrustedImageBytes(absolute, options.origin);
  const sizes = options.sizes?.length ? options.sizes : (["feed", "story"] as const);
  const social: BlogSocialImages = {
    ...(options.post.socialImages ?? blankSocialImages()),
  };
  const keys: Record<string, string> = {};

  for (const size of sizes) {
    const key = await cropSocialFromSource({
      sourceBytes: bytes,
      size,
      slug: options.post.slug,
    });
    keys[size] = key;
    if (size === "feed") social.feedUrl = key;
    else social.storyUrl = key;
  }

  return { socialImages: social, keys };
}
