/**
 * Brightline client for Mirotech dual-brand content API.
 * Env: MIROTECH_CONTENT_API_URL (default https://mirotech.solutions), CONTENT_API_SECRET (optional).
 */

import { getPublicR2Url } from "@/lib/r2";
import { preferPortfolioWebFullKey } from "@/lib/portfolio-web-full";

export type DualBrandWorkProject = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  summary: string;
  year: number;
  categories: string[];
  disciplines: string[];
  heroImage?: string;
  thumbnailImage?: string;
  backgroundMedia?: string;
  backgroundPoster?: string;
  featured: boolean;
  sortOrder: number;
  brightlineExternalId?: string;
  brightlineSection?: string;
  photoNarrative?: {
    overview?: string;
    approach?: string;
    location?: string;
    notes?: string;
  };
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  challenge?: string;
  outcome?: string;
  role?: string;
  duration?: string;
  tools?: string[];
  platforms?: string[];
  publishMirotech?: boolean;
  publishBrightline?: boolean;
  sections?: Array<{
    id: string;
    type: string;
    title?: string;
    body?: string;
    data?: unknown;
  }>;
};

export type DualBrandJournalPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body?: string;
  heroImage?: string;
  backgroundMedia?: string;
  backgroundPoster?: string;
  author?: string;
  publishedAt?: string;
  categories: string[];
  tags: string[];
  featured: boolean;
  caseStudyId?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Structured gallery / takeaways / case blocks (shared with Mirotech journal). */
  articlePayload?: {
    coverImageAlt?: string;
    pullQuote?: string;
    keyTakeaways?: string;
    photoCredits?: string;
    caseStudy?: {
      brief?: string;
      problem?: string;
      solution?: string;
    };
    galleryImages?: Array<{ url: string; alt?: string }>;
    galleryBlocks?: Array<{ urls?: string[] }>;
    linkedWork?: { slug?: string; title?: string };
  } | null;
};

function baseUrl(): string {
  return (
    process.env.MIROTECH_CONTENT_API_URL?.trim().replace(/\/$/, "") ||
    "https://mirotech.solutions"
  );
}

function authHeaders(): HeadersInit {
  const secret = process.env.CONTENT_API_SECRET?.trim();
  return secret ? { Authorization: `Bearer ${secret}` } : {};
}

export async function fetchDualBrandWork(): Promise<DualBrandWorkProject[]> {
  return fetchWorkList("BRIGHTLINE");
}

export async function fetchDualBrandWorkBySlug(
  slug: string
): Promise<DualBrandWorkProject | null> {
  return fetchWorkBySlug("BRIGHTLINE", slug);
}

async function fetchWorkBySlug(
  site: "MIROTECH" | "BRIGHTLINE",
  slug: string
): Promise<DualBrandWorkProject | null> {
  try {
    const res = await fetch(
      `${baseUrl()}/api/content/v1/work/${encodeURIComponent(slug)}?site=${site}`,
      {
        headers: authHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { project?: DualBrandWorkProject };
    return data.project ?? null;
  } catch {
    return null;
  }
}

async function fetchWorkList(site: "MIROTECH" | "BRIGHTLINE"): Promise<DualBrandWorkProject[]> {
  try {
    const res = await fetch(`${baseUrl()}/api/content/v1/work?site=${site}`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { projects?: DualBrandWorkProject[] };
    return Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

/** Published Work case studies on mirotech.solutions. */
export async function fetchMirotechSiteWork(): Promise<DualBrandWorkProject[]> {
  return fetchWorkList("MIROTECH");
}

export async function fetchMirotechSiteWorkBySlug(
  slug: string
): Promise<DualBrandWorkProject | null> {
  return fetchWorkBySlug("MIROTECH", slug);
}

export async function fetchDualBrandJournal(): Promise<DualBrandJournalPost[]> {
  return fetchJournalList("BRIGHTLINE");
}

async function fetchJournalList(site: "MIROTECH" | "BRIGHTLINE"): Promise<DualBrandJournalPost[]> {
  try {
    const res = await fetch(`${baseUrl()}/api/content/v1/journal?site=${site}`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { posts?: DualBrandJournalPost[] };
    return Array.isArray(data.posts) ? data.posts : [];
  } catch {
    return [];
  }
}

/** Published journal posts on mirotech.solutions. */
export async function fetchMirotechSiteJournal(): Promise<DualBrandJournalPost[]> {
  return fetchJournalList("MIROTECH");
}

export async function fetchDualBrandJournalBySlug(
  slug: string
): Promise<DualBrandJournalPost | null> {
  try {
    const res = await fetch(
      `${baseUrl()}/api/content/v1/journal?site=BRIGHTLINE&slug=${encodeURIComponent(slug)}`,
      {
        headers: authHeaders(),
        // Publish / field edits must show immediately on shared blog.
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { post?: DualBrandJournalPost };
    return data.post ?? null;
  } catch {
    return null;
  }
}

/** Prefer local WorkProject when linked; otherwise shared collaboration route. */
export function dualBrandWorkHref(project: DualBrandWorkProject): string {
  if (project.brightlineExternalId && project.brightlineSection) {
    return `/work/${encodeURIComponent(project.brightlineSection)}/${encodeURIComponent(project.slug)}`;
  }
  return `/work/shared/${encodeURIComponent(project.slug)}`;
}

/** Resolve dual-brand hero/thumb R2 keys for Brightline public img src. */
export function dualBrandMediaSrc(value?: string | null): string {
  const v = preferPortfolioWebFullKey(value?.trim() || "");
  if (!v) return "";
  if (/^(https?:|data:|blob:)/i.test(v) || v.startsWith("/")) return v;
  return getPublicR2Url(v.replace(/^\/+/, ""));
}
