/**
 * Brightline Studio CMS hub client → Mirotech CaseStudy / Journal APIs.
 * Read helpers and DTO types. Remote writes delegate to platform/mirotech (Phase 6D).
 */
import {
  isMirotechRemotePublishConfigured,
  mirotechContentFetch,
} from "@/lib/platform/publishing/mirotech/remote-client";
import {
  mirotechCreateHubBlog,
  mirotechCreateHubProject,
  mirotechDeleteHubProject,
  mirotechUpdateHubBlog,
  mirotechUpdateHubProject,
} from "@/lib/platform/publishing/mirotech/hub-remote-write";

export type HubJournalSummary = {
  id: string;
  slug: string;
  title: string;
  status: string;
  primarySite: string;
  publishedAt: string | null;
  updatedAt: string;
};

export type HubPhotoNarrative = {
  overview?: string;
  approach?: string;
  location?: string;
  notes?: string;
};

export type HubProject = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  summary: string;
  year: number | null;
  status: string;
  categories: string[];
  disciplines: string[];
  tools: string[];
  platforms: string[];
  publishMirotech: boolean;
  publishBrightline: boolean;
  sortOrderMirotech: number;
  sortOrderBrightline: number;
  featuredMirotech: boolean;
  featuredBrightline: boolean;
  brightlineExternalId?: string | null;
  brightlineSection?: string | null;
  photoNarrative?: HubPhotoNarrative | null;
  projectType?: string;
  challenge?: string | null;
  outcome?: string | null;
  role?: string | null;
  duration?: string | null;
  clientType?: string | null;
  projectDisclaimer?: string | null;
  whatsNext?: string | null;
  heroImage?: string | null;
  thumbnailImage?: string | null;
  backgroundMedia?: string | null;
  backgroundPoster?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
  sections?: Array<{
    id?: string;
    type: string;
    title?: string | null;
    body?: string | null;
    data?: unknown;
    sortOrder?: number;
  }>;
  journalPosts?: HubJournalSummary[];
  journalSummaries?: HubJournalSummary[];
  journalPostsFull?: HubJournalPost[];
};

export type HubJournalPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  heroImage?: string | null;
  backgroundMedia?: string | null;
  backgroundPoster?: string | null;
  author: string;
  status: string;
  primarySite: string;
  categories: string[];
  tags: string[];
  featured: boolean;
  caseStudyId?: string | null;
  titleBrightline?: string | null;
  excerptBrightline?: string | null;
  bodyBrightline?: string | null;
  heroImageBrightline?: string | null;
  articlePayload?: unknown;
  publishedAt?: string | null;
};

export function isStudioHubConfigured(): boolean {
  return isMirotechRemotePublishConfigured();
}

async function hubFetch(path: string, init?: RequestInit) {
  return mirotechContentFetch(path, init);
}

export async function listHubProjects(): Promise<HubProject[]> {
  const data = await hubFetch("/api/content/v1/projects");
  return Array.isArray(data.projects) ? (data.projects as HubProject[]) : [];
}

/** Flatten hub project journal summaries for Admin → Blog → Shared. */
export type HubSharedBlogEntry = {
  journalId: string;
  projectId: string;
  projectTitle: string;
  title: string;
  slug: string;
  status: string;
  primarySite: string;
  publishedAt: string | null;
  updatedAt: string;
  hubHref: string;
  previewHref: string;
};

export async function listHubSharedBlogEntries(): Promise<HubSharedBlogEntry[]> {
  if (!isStudioHubConfigured()) return [];
  try {
    const projects = await listHubProjects();
    const entries: HubSharedBlogEntry[] = [];
    for (const p of projects) {
      const journals = p.journalPosts || p.journalSummaries || [];
      for (const j of journals) {
        entries.push({
          journalId: j.id,
          projectId: p.id,
          projectTitle: p.title,
          title: j.title,
          slug: j.slug,
          status: j.status,
          primarySite: j.primarySite,
          publishedAt: j.publishedAt,
          updatedAt: j.updatedAt || "",
          hubHref: `/admin/studio-cms/${encodeURIComponent(p.id)}`,
          previewHref: `/admin/studio-cms/${encodeURIComponent(p.id)}/blog-preview?site=brightline`,
        });
      }
    }
    entries.sort((a, b) => {
      const aT = a.updatedAt || a.publishedAt || "";
      const bT = b.updatedAt || b.publishedAt || "";
      return bT.localeCompare(aT);
    });
    return entries;
  } catch (e) {
    console.error("HUB_SHARED_BLOG_LIST_ERROR", e);
    return [];
  }
}

export async function getHubProject(id: string): Promise<HubProject | null> {
  try {
    const data = await hubFetch(`/api/content/v1/projects/${encodeURIComponent(id)}`);
    const project = data.project as HubProject | undefined;
    if (!project) return null;
    const rawPosts = (project as HubProject & { journalPosts?: HubJournalPost[] }).journalPosts;
    const full = Array.isArray(rawPosts) ? rawPosts : [];
    return {
      ...project,
      journalSummaries:
        project.journalSummaries ||
        full.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          status: p.status,
          primarySite: p.primarySite,
          publishedAt: p.publishedAt ?? null,
          updatedAt: "",
        })),
      journalPostsFull: full,
    };
  } catch (e) {
    if (e instanceof Error && /not found/i.test(e.message)) return null;
    throw e;
  }
}

export async function createHubProject(payload: Record<string, unknown>): Promise<HubProject> {
  return mirotechCreateHubProject(payload);
}

export async function updateHubProject(
  id: string,
  payload: Record<string, unknown>
): Promise<HubProject> {
  return mirotechUpdateHubProject(id, payload);
}

export async function deleteHubProject(
  id: string
): Promise<{ id: string; slug: string; title: string }> {
  return mirotechDeleteHubProject(id);
}

export async function createHubBlog(
  projectId: string,
  payload: Record<string, unknown> = {}
): Promise<{ created: boolean; post: HubJournalPost; summary: HubJournalSummary }> {
  return mirotechCreateHubBlog(projectId, payload);
}

export async function updateHubBlog(
  projectId: string,
  payload: Record<string, unknown>
): Promise<{ post: HubJournalPost; summary: HubJournalSummary }> {
  return mirotechUpdateHubBlog(projectId, payload);
}

export function distributionStatus(opts: {
  workStatus: string;
  publishBrightline: boolean;
  publishMirotech: boolean;
  blogStatus?: string | null;
  blogPrimarySite?: string | null;
}): {
  brightlineWork: "off" | "draft" | "live";
  mirotechWork: "off" | "draft" | "live";
  blog: "off" | "draft" | "live";
} {
  const workLive = opts.workStatus === "PUBLISHED";
  const blogLive = opts.blogStatus === "PUBLISHED";
  return {
    brightlineWork: !opts.publishBrightline ? "off" : workLive ? "live" : "draft",
    mirotechWork: !opts.publishMirotech ? "off" : workLive ? "live" : "draft",
    blog: !opts.blogStatus ? "off" : blogLive ? "live" : "draft",
  };
}
