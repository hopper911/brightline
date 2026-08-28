/**
 * Mirotech remote publish domain layer (Phase 6D).
 * Owns HTTP transport, journal ingest transformation, and hub CMS writes.
 */
export {
  isMirotechRemotePublishConfigured,
  mirotechContentFetch,
  mirotechPublishBearer,
  mirotechSiteOrigin,
} from "@/lib/platform/publishing/mirotech/remote-client";
export {
  isMirotechJournalSyncConfigured,
  syncBlogPostToMirotech,
  syncBlogPostsToMirotech,
  type MirotechJournalSyncResult,
} from "@/lib/platform/publishing/mirotech/journal-ingest";
export {
  mirotechCreateHubBlog,
  mirotechCreateHubProject,
  mirotechDeleteHubProject,
  mirotechUpdateHubBlog,
  mirotechUpdateHubProject,
} from "@/lib/platform/publishing/mirotech/hub-remote-write";
