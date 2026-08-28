import type { BlogPost } from "@/lib/blog-post-model";
import type { MirotechJournalSyncResult } from "@/lib/platform/publishing/mirotech/journal-ingest";
import type {
  HubJournalPost,
  HubJournalSummary,
  HubProject,
} from "@/lib/dual-brand/studio-hub";

/** Read port — load Brightline content eligible for Mirotech publish (Phase 6B). */
export type MirotechPublishingReadPort = {
  getBlogPostById(id: string): Promise<BlogPost | null>;
};

/** Write port — Mirotech domain remote writes (Phase 6D). */
export type MirotechPublishingWritePort = {
  isJournalSyncConfigured(): boolean;
  syncBlogPostToMirotech(post: BlogPost): Promise<MirotechJournalSyncResult>;
  updateHubProject(id: string, payload: Record<string, unknown>): Promise<HubProject>;
  updateHubBlog(
    projectId: string,
    payload: Record<string, unknown>
  ): Promise<{ post: HubJournalPost; summary: HubJournalSummary }>;
};

export const MIROTECH_JOURNAL_INGEST_PATH = "/api/content/v1/journal/ingest";
