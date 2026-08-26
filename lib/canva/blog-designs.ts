import { putObjectBuffer } from "@/lib/storage-r2";
import {
  CANVA_DESIGN_SIZES,
  createCanvaDesign,
  exportDesignAsJpg,
  uploadImageAsset,
  type CanvaDesignSize,
} from "@/lib/canva/client";
import { resolveAbsoluteMediaUrl } from "@/lib/ai/generateBlogAiVideo";
import type { BlogCanvaDesigns, BlogPost, BlogSocialImages } from "@/lib/blog-post-model";
import { blankCanvaDesigns, blankSocialImages } from "@/lib/blog-post-model";
import { fetchTrustedImageBytes } from "@/lib/safe-fetch-image";
import { CANVA_DOWNLOAD_HOST_SUFFIXES, fetchPublicUrlBytes } from "@/lib/safe-fetch-url";

function sanitizeSlug(slug: string) {
  return slug.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "post";
}


export async function createBlogCanvaDesigns(options: {
  post: BlogPost;
  sizes: CanvaDesignSize[];
  seedImageUrl?: string;
  origin: string;
}): Promise<{ designs: BlogCanvaDesigns; sizes: CanvaDesignSize[]; errors: string[] }> {
  let assetId: string | undefined;
  const seed = options.seedImageUrl?.trim();
  if (seed) {
    try {
      const absolute = resolveAbsoluteMediaUrl(seed, options.origin);
      const bytes = await fetchTrustedImageBytes(absolute, options.origin);
      if (bytes) {
        assetId = await uploadImageAsset({
          bytes,
          name: `${options.post.slug.slice(0, 30) || "post"}-seed`,
        });
      }
    } catch (err) {
      console.warn("CANVA_SEED_UPLOAD_SKIPPED", err);
    }
  }

  const current = options.post.canvaDesigns ?? blankCanvaDesigns();
  const next: BlogCanvaDesigns = { ...current };
  const errors: string[] = [];

  for (let i = 0; i < options.sizes.length; i += 1) {
    const size = options.sizes[i]!;
    const label = CANVA_DESIGN_SIZES[size].label;
    const title = `${options.post.title || "Brightline"} — ${label}`.slice(0, 255);
    // Only attach seed asset on the first canvas — reuse can fail on Free for later sizes
    const useAsset = i === 0 ? assetId : undefined;
    try {
      const created = await createCanvaDesign({
        size,
        title,
        assetId: useAsset,
      });
      if (size === "cover") {
        next.coverId = created.id;
        next.coverEditUrl = created.editUrl;
      } else if (size === "feed") {
        next.feedId = created.id;
        next.feedEditUrl = created.editUrl;
      } else {
        next.storyId = created.id;
        next.storyEditUrl = created.editUrl;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to create ${size}`;
      console.error("CANVA_CREATE_SIZE_ERROR", size, err);
      errors.push(`${label}: ${msg}`);
      // Retry once without asset if the first attempt used one
      if (useAsset) {
        try {
          const created = await createCanvaDesign({ size, title });
          if (size === "cover") {
            next.coverId = created.id;
            next.coverEditUrl = created.editUrl;
          } else if (size === "feed") {
            next.feedId = created.id;
            next.feedEditUrl = created.editUrl;
          } else {
            next.storyId = created.id;
            next.storyEditUrl = created.editUrl;
          }
          errors.pop();
        } catch (retryErr) {
          console.error("CANVA_CREATE_SIZE_RETRY_ERROR", size, retryErr);
        }
      }
    }
  }

  const createdCount = [next.coverId, next.feedId, next.storyId].filter(Boolean).length;
  if (createdCount === 0) {
    throw Object.assign(
      new Error(errors[0] || "Failed to create any Canva designs."),
      { status: 502 }
    );
  }

  return { designs: next, sizes: options.sizes, errors };
}

export async function importCanvaDesignToR2(options: {
  post: BlogPost;
  size: CanvaDesignSize;
}): Promise<{
  key: string;
  patch: Partial<BlogPost>;
}> {
  const designs = options.post.canvaDesigns ?? blankCanvaDesigns();
  const designId =
    options.size === "cover"
      ? designs.coverId
      : options.size === "feed"
        ? designs.feedId
        : designs.storyId;

  if (!designId) {
    throw Object.assign(
      new Error(`No Canva ${options.size} design on this post. Create one first.`),
      { status: 400 }
    );
  }

  const downloadUrl = await exportDesignAsJpg(designId);
  const downloaded = await fetchPublicUrlBytes(downloadUrl, {
    maxBytes: 25 * 1024 * 1024,
    allowedHostSuffixes: CANVA_DOWNLOAD_HOST_SUFFIXES,
    accept: "image/*,*/*;q=0.8",
  });
  if (downloaded.bytes.byteLength < 500) {
    throw Object.assign(new Error("Downloaded Canva export was empty."), { status: 502 });
  }

  const key = `site/blog/${sanitizeSlug(options.post.slug)}/canva-${options.size}-${Date.now()}.jpg`;
  await putObjectBuffer({
    key,
    body: downloaded.bytes,
    contentType: "image/jpeg",
    access: "private",
  });

  const social: BlogSocialImages = {
    ...(options.post.socialImages ?? blankSocialImages()),
  };
  const patch: Partial<BlogPost> = {
    canvaDesigns: designs,
    updatedAt: new Date().toISOString(),
  };

  if (options.size === "cover") {
    patch.coverImageUrl = key;
    if (!options.post.coverImageAlt.trim()) {
      patch.coverImageAlt = `${options.post.title} — cover`.slice(0, 160);
    }
  } else if (options.size === "feed") {
    social.feedUrl = key;
    patch.socialImages = social;
  } else {
    social.storyUrl = key;
    patch.socialImages = social;
  }

  return { key, patch };
}
