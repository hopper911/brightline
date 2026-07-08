/**
 * One-time import from Adobe Portfolio into BRIGHTLINE Journal drafts.
 *
 * Usage (from brightline/):
 *   npx tsx scripts/import-myportfolio-journal.ts
 *
 * Optional:
 *   DRY_RUN=1 npx tsx scripts/import-myportfolio-journal.ts
 */
import "./load-cli-env";
import { blankBlogPost, getBlogPosts, saveBlogPosts, type BlogGalleryImage, type BlogPost } from "@/lib/blog-posts";
import { getPublicR2Url } from "@/lib/r2";
import { putObjectBuffer } from "@/lib/storage-r2";

type SourcePage = {
  slug: string;
  url: string;
  title: string;
  tags: string[];
  year: string;
};

const SOURCES: SourcePage[] = [
  {
    slug: "waldo-ux-ui-case-study",
    url: "https://kiri1.myportfolio.com/uxui-case-study",
    title: "Waldo App: UX/UI Case Study",
    tags: ["UX", "Case study"],
    year: "2023",
  },
  {
    slug: "eshave-ux-ui-case-study",
    url: "https://kiri1.myportfolio.com/uxui",
    title: "eShave: UX/UI Case Study",
    tags: ["UX", "Case study"],
    year: "2023",
  },
  {
    slug: "about-kiril-mironyuk",
    url: "https://kiri1.myportfolio.com/about",
    title: "About",
    tags: ["Studio"],
    year: "2023",
  },
  {
    slug: "photo-retouching",
    url: "https://kiri1.myportfolio.com/photo-retouching",
    title: "Photo Retouching",
    tags: ["Retouching"],
    year: "2023",
  },
  {
    slug: "graphic-design",
    url: "https://kiri1.myportfolio.com/graphic-design-1",
    title: "Graphic Design",
    tags: ["Design"],
    year: "2023",
  },
  {
    slug: "food-photography",
    url: "https://kiri1.myportfolio.com/food",
    title: "Food Photography",
    tags: ["Food", "Photography"],
    year: "2024",
  },
  {
    slug: "photography",
    url: "https://kiri1.myportfolio.com/photography",
    title: "Photography",
    tags: ["Photography"],
    year: "2023",
  },
  {
    slug: "erny",
    url: "https://kiri1.myportfolio.com/edward-roth-gallery",
    title: "ERNY",
    tags: ["ERNY"],
    year: "2023",
  },
];

const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE = process.env.FORCE === "1";
const imageCache = new Map<string, string>();

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ");
}

function stripTags(html: string) {
  return decodeHtml(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function extractMeta(html: string, property: string) {
  const match = html.match(
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
  );
  return match?.[1]?.trim() ?? "";
}

function extractTitle(html: string, fallback: string) {
  const h1 = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1?.[1]) {
    const cleaned = stripTags(h1[1]);
    if (cleaned) return cleaned;
  }
  const og = extractMeta(html, "og:title");
  if (og) return og.replace(/^kiril mironyuk\s*-\s*/i, "").trim();
  return fallback;
}

function extractDescription(html: string) {
  const desc = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (desc?.[1]) return stripTags(desc[1]);
  return extractMeta(html, "og:description");
}

function normalizePortfolioImageUrl(raw: string) {
  const url = raw.trim();
  if (!url || !url.includes("cdn.myportfolio.com")) return "";
  if (url.includes("data:image")) return "";
  if (/_carw_|_car_4x3/i.test(url)) return "";

  const [pathPart, queryPart] = url.split("?");
  const hash = queryPart?.match(/(?:^|&)h=([^&]+)/)?.[1];
  const suffix = hash ? `?h=${hash}` : "";

  const withoutQuery = pathPart ?? url;
  const rwMatch = url.match(/(https:\/\/cdn\.myportfolio\.com\/[^"'\s]+_rw_1920\.(?:jpg|jpeg|png|webp))/i);
  if (rwMatch?.[1]) return `${rwMatch[1]}${suffix}`;

  if (/_rw_\d+\.(jpg|jpeg|png|webp)$/i.test(withoutQuery)) {
    const upgraded = withoutQuery.replace(/_rw_\d+\.(jpg|jpeg|png|webp)$/i, "_rw_1920.$1");
    return `${upgraded}${suffix}`;
  }

  if (/\.(jpg|jpeg|png|webp)$/i.test(withoutQuery)) return `${withoutQuery}${suffix}`;
  return "";
}

function imageBaseKey(url: string) {
  const path = url.split("?")[0] ?? url;
  return path.replace(/_rw_\d+\.(jpg|jpeg|png|webp)$/i, ".$1");
}

function scoreImageUrl(url: string) {
  if (url.includes("_rw_1920")) return 100;
  if (url.includes("_rw_1200")) return 80;
  if (url.includes("_rw_600")) return 60;
  if (/\.jpg$/i.test(url)) return 40;
  return 10;
}

function extractImageUrls(html: string) {
  const candidates = new Set<string>();

  for (const match of html.matchAll(/data-src="(https:\/\/cdn\.myportfolio\.com\/[^"]+)"/gi)) {
    const normalized = normalizePortfolioImageUrl(match[1] ?? "");
    if (normalized) candidates.add(normalized);
  }
  for (const match of html.matchAll(/data-srcset="([^"]+)"/gi)) {
    const srcset = match[1] ?? "";
    for (const part of srcset.split(",")) {
      const url = part.trim().split(/\s+/)[0];
      const normalized = normalizePortfolioImageUrl(url ?? "");
      if (normalized) candidates.add(normalized);
    }
  }
  for (const match of html.matchAll(/data-src="(https:\/\/cdn\.myportfolio\.com\/[^"]+\.jpg[^"]*)"/gi)) {
    const normalized = normalizePortfolioImageUrl(match[1] ?? "");
    if (normalized) candidates.add(normalized);
  }

  const og = extractMeta(html, "og:image");
  const ogNormalized = normalizePortfolioImageUrl(og.replace(/_car[^/]*\.jpg/i, ".jpg"));
  if (ogNormalized) candidates.add(ogNormalized);

  const byBase = new Map<string, string>();
  for (const url of candidates) {
    const base = imageBaseKey(url);
    const current = byBase.get(base);
    if (!current || scoreImageUrl(url) > scoreImageUrl(current)) {
      byBase.set(base, url);
    }
  }

  return [...byBase.values()].sort((a, b) => scoreImageUrl(b) - scoreImageUrl(a));
}

function extractBody(html: string) {
  const blocks: string[] = [];
  const modulePattern =
    /<div class="project-module module text project-module-text[\s\S]*?<div class="rich-text js-text-editable module-text">([\s\S]*?)<\/div>/gi;

  for (const match of html.matchAll(modulePattern)) {
    const raw = match[1] ?? "";
    const withHeadings = raw
      .replace(/<div[^>]*class="[^"]*title[^"]*"[^>]*>/gi, "\n\n## ")
      .replace(/<\/div>/gi, "\n")
      .replace(/<div[^>]*>/gi, "\n");
    const text = stripTags(withHeadings)
      .replace(/\s*##\s*/g, "\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text) blocks.push(text);
  }

  return blocks.join("\n\n").trim();
}

function excerptFromBody(body: string, title: string) {
  const source = body || title;
  if (source.length <= 160) return source;
  return `${source.slice(0, 157).trim()}…`;
}

function extensionFromUrl(url: string) {
  const path = (url.split("?")[0] ?? url).toLowerCase();
  if (path.endsWith(".png")) return "png";
  if (path.endsWith(".webp")) return "webp";
  if (path.endsWith(".jpeg")) return "jpeg";
  return "jpg";
}

function contentTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpeg") return "image/jpeg";
  return "image/jpeg";
}

async function downloadImage(sourceUrl: string) {
  const res = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BRIGHTLINE-Journal-Import/1.0)",
      Referer: "https://kiri1.myportfolio.com/",
      Accept: "image/*,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Failed to download ${sourceUrl} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadImage(sourceUrl: string, key: string) {
  if (imageCache.has(sourceUrl)) return imageCache.get(sourceUrl)!;
  if (DRY_RUN) {
    const dry = getPublicR2Url(key);
    imageCache.set(sourceUrl, dry);
    return dry;
  }

  const buf = await downloadImage(sourceUrl);
  const ext = extensionFromUrl(sourceUrl);
  await putObjectBuffer({
    key,
    body: buf,
    contentType: contentTypeFromExt(ext),
    access: "public-read",
  });
  const publicUrl = getPublicR2Url(key);
  imageCache.set(sourceUrl, publicUrl);
  return publicUrl;
}

async function importPage(source: SourcePage): Promise<BlogPost | null> {
  console.log(`\n→ ${source.title} (${source.url})`);
  const res = await fetch(source.url, {
    headers: { "User-Agent": "BRIGHTLINE-Journal-Import/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${source.url} (${res.status})`);
  const html = await res.text();

  const title = extractTitle(html, source.title);
  const description = extractDescription(html);
  const body = extractBody(html);
  const imageUrls = extractImageUrls(html);

  console.log(`  text blocks: ${body ? "yes" : "no"} | images found: ${imageUrls.length}`);

  const uploadedUrls: string[] = [];
  for (let i = 0; i < imageUrls.length; i += 1) {
    const sourceUrl = imageUrls[i]!;
    const ext = extensionFromUrl(sourceUrl);
    const key = `journal/import/${source.slug}/${String(i + 1).padStart(2, "0")}.${ext}`;
    try {
      const publicUrl = await uploadImage(sourceUrl, key);
      uploadedUrls.push(publicUrl);
      console.log(`  uploaded ${i + 1}/${imageUrls.length}`);
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (err) {
      console.warn(`  skip image ${i + 1}: ${err instanceof Error ? err.message : err}`);
      if (process.env.HOTLINK_FALLBACK !== "0") {
        uploadedUrls.push(sourceUrl);
        console.warn(`  using hotlink fallback for image ${i + 1}`);
      }
    }
  }

  const coverImageUrl = uploadedUrls[0] ?? "";
  const galleryImages: BlogGalleryImage[] = uploadedUrls.slice(1).map((url, index) => ({
    url,
    alt: `${title} image ${index + 2}`,
  }));

  const now = new Date().toISOString();
  const post = blankBlogPost(title);
  return {
    ...post,
    slug: source.slug,
    title,
    excerpt: description || excerptFromBody(body, title),
    body,
    coverImageUrl,
    coverImageAlt: title,
    galleryImages,
    author: "BRIGHTLINE",
    tags: source.tags,
    seoTitle: `${title} · BRIGHTLINE Photography`,
    seoDescription: description || excerptFromBody(body, title),
    status: "DRAFT",
    publishedAt: `${source.year}-01-01T12:00:00.000Z`,
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  const existing = await getBlogPosts();
  const existingSlugs = new Set(
    FORCE ? existing.filter((post) => !SOURCES.some((s) => s.slug === post.slug)).map((p) => p.slug) : existing.map((p) => p.slug)
  );
  const keptPosts = FORCE ? existing.filter((post) => !SOURCES.some((s) => s.slug === post.slug)) : existing;
  const imported: BlogPost[] = [];

  for (const source of SOURCES) {
    if (existingSlugs.has(source.slug)) {
      console.log(`\n→ skip ${source.slug} (already exists)`);
      continue;
    }
    const post = await importPage(source);
    if (post) imported.push(post);
  }

  if (imported.length === 0) {
    console.log("\nNo new posts to import.");
    return;
  }

  if (DRY_RUN) {
    console.log(`\nDRY_RUN: would save ${imported.length} draft post(s).`);
    return;
  }

  const merged = [...imported, ...keptPosts];
  await saveBlogPosts(merged);
  console.log(`\nSaved ${imported.length} draft post(s) to blog_posts:v1.`);
  console.log("Review at /admin/blog, publish when ready, then enable Blog in Website pages → Navigation.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
