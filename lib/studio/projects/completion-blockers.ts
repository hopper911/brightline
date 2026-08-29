/**
 * Map completeness missing labels to queue blocker categories (Phase 25).
 */

export type CompletionBlockerCategory = "content" | "media" | "seo";

const CONTENT_LABELS = new Set(
  [
    "title",
    "slug",
    "project summary",
    "project body",
    "work section",
    "case study sections",
    "outcome or challenge",
    "outcome",
    "challenge",
    "role (template)",
    "publishing target (Mirotech)",
  ].map((s) => s.toLowerCase())
);

const MEDIA_LABELS = new Set(["hero asset", "open graph image"].map((s) => s.toLowerCase()));

const SEO_LABELS = new Set(["seo title", "seo description"].map((s) => s.toLowerCase()));

const FRIENDLY_LABELS: Record<string, string> = {
  title: "title",
  slug: "URL slug",
  "project summary": "summary",
  "project body": "case study body",
  "work section": "work pillar section",
  "hero asset": "final hero image",
  "case study sections": "case study sections",
  "outcome or challenge": "outcome or challenge narrative",
  outcome: "outcome narrative",
  challenge: "challenge narrative",
  "role (template)": "role and ownership",
  "publishing target (Mirotech)": "Mirotech publish target",
  "seo title": "SEO title",
  "seo description": "meta description",
  "open graph image": "Open Graph image",
};

export function friendlyBlockerLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key.startsWith("template section:")) {
    return raw.replace(/^template section:\s*/i, "section: ");
  }
  return FRIENDLY_LABELS[key] ?? raw;
}

export function categorizeMissingBlockers(missing: string[]): Record<CompletionBlockerCategory, string[]> {
  const out: Record<CompletionBlockerCategory, string[]> = {
    content: [],
    media: [],
    seo: [],
  };

  for (const item of missing) {
    const label = item.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (key.startsWith("template section:")) {
      out.content.push(friendlyBlockerLabel(label));
      continue;
    }
    if (MEDIA_LABELS.has(key)) {
      out.media.push(friendlyBlockerLabel(label));
    } else if (SEO_LABELS.has(key)) {
      out.seo.push(friendlyBlockerLabel(label));
    } else if (CONTENT_LABELS.has(key)) {
      out.content.push(friendlyBlockerLabel(label));
    } else {
      out.content.push(friendlyBlockerLabel(label));
    }
  }

  return out;
}

export function friendlyMissingList(missing: string[]): string[] {
  return missing.map((m) => friendlyBlockerLabel(m));
}
