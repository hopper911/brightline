import type { AltTextProjectContext } from "@/lib/ai/generateAltText";
import type { BlogPost } from "@/lib/blog-post-model";

export function buildBlogAltContext(
  post: Pick<BlogPost, "title" | "excerpt" | "body" | "tags">
): AltTextProjectContext {
  const snippet = post.excerpt.trim() || post.body.trim().slice(0, 400);
  return {
    projectTitle: post.title.trim() || undefined,
    whatWasPhotographed: snippet || undefined,
    visualApproach: post.tags.length
      ? `BRIGHTLINE Journal — ${post.tags.join(", ")}`
      : "BRIGHTLINE Journal photography",
  };
}

export type VisionAltResponse = { altText?: string; error?: string };

export async function fetchVisionAltText(
  imageUrl: string,
  post: Pick<BlogPost, "title" | "excerpt" | "body" | "tags">
): Promise<string> {
  const res = await fetch("/api/admin/media/generate-alt-text", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      projectContext: buildBlogAltContext(post),
    }),
  });
  const data = (await res.json()) as VisionAltResponse;
  if (!res.ok || !data.altText?.trim()) {
    throw new Error(data.error ?? "Could not generate alt text for this image.");
  }
  return data.altText.trim();
}

/** Run async tasks with limited concurrency. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  limit = 3
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!, index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}
