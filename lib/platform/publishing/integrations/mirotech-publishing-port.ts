import type { BlogPost } from "@/lib/blog-post-model";
import type { MirotechJournalSyncResult } from "@/lib/dual-brand/sync-journal";

/** Read port — load Brightline content eligible for Mirotech publish (Phase 6B). */
export type MirotechPublishingReadPort = {
  getBlogPostById(id: string): Promise<BlogPost | null>;
};

/** Write port — delegates to existing cross-site sync clients (Phase 6B). */
export type MirotechPublishingWritePort = {
  isJournalSyncConfigured(): boolean;
  syncBlogPostToMirotech(post: BlogPost): Promise<MirotechJournalSyncResult>;
};

export const MIROTECH_JOURNAL_INGEST_PATH = "/api/content/v1/journal/ingest";
