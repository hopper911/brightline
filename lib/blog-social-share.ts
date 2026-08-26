import { BRAND, getUrl } from "@/lib/config/brand";
import type { BlogPost } from "@/lib/blog-post-model";

export type SocialSharePlatform = "instagram" | "youtube" | "tiktok";

export type SocialShareDraft = {
  platform: SocialSharePlatform;
  label: string;
  caption: string;
  hint: string;
};

function hashtags(tags: string[]): string {
  return tags
    .slice(0, 8)
    .map((tag) => `#${tag.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase()}`)
    .filter((tag) => tag.length > 1)
    .join(" ");
}

function postUrl(post: Pick<BlogPost, "slug" | "format">) {
  const base = post.format === "travel" ? "/travel" : "/blog";
  return getUrl(`${base}/${post.slug}`);
}

function summaryLine(post: BlogPost): string {
  if (post.caseStudy.briefEnabled && post.caseStudy.brief.trim()) {
    return post.caseStudy.brief.trim().slice(0, 220);
  }
  if (post.excerpt.trim()) return post.excerpt.trim().slice(0, 220);
  if (post.body.trim()) return post.body.trim().slice(0, 220);
  return "";
}

function problemSolutionSnippet(post: BlogPost): string {
  const parts: string[] = [];
  if (post.caseStudy.problemEnabled && post.caseStudy.problem.trim()) {
    parts.push(`Problem: ${post.caseStudy.problem.trim().slice(0, 160)}`);
  }
  if (post.caseStudy.solutionEnabled && post.caseStudy.solution.trim()) {
    parts.push(`Solution: ${post.caseStudy.solution.trim().slice(0, 160)}`);
  }
  return parts.join("\n");
}

/** Build copy-ready captions for Instagram, YouTube, and TikTok from a journal post. */
export function buildSocialShareDrafts(post: BlogPost): SocialShareDraft[] {
  const url = postUrl(post);
  const tags = hashtags(post.tags);
  const summary = summaryLine(post);
  const caseBits = problemSolutionSnippet(post);

  const instagram = [
    post.title,
    "",
    summary,
    caseBits ? `\n${caseBits}` : "",
    "",
    `Full story → ${url}`,
    "",
    tags || "#brightline #photography #journal",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();

  const youtube = [
    `Title: ${post.title} | ${BRAND.name}`,
    "",
    "Description:",
    summary || post.title,
    caseBits ? `\n${caseBits}` : "",
    "",
    `Read the full journal entry: ${url}`,
    "",
    tags ? `Tags: ${tags}` : "",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();

  const tiktok = [
    `${post.title}${summary ? ` — ${summary.slice(0, 100)}` : ""}`,
    "",
    url,
    "",
    tags || "#brightline #photography",
  ]
    .join("\n")
    .trim();

  return [
    {
      platform: "instagram",
      label: "Instagram",
      caption: instagram,
      hint: "Paste into a feed post or Reel caption. Add your cover or gallery stills manually.",
    },
    {
      platform: "youtube",
      label: "YouTube",
      caption: youtube,
      hint: "Use as video title + description. Upload your video separately, then paste this text.",
    },
    {
      platform: "tiktok",
      label: "TikTok",
      caption: tiktok,
      hint: "Paste as the TikTok caption. Keep under ~2,200 characters for best results.",
    },
  ];
}
