import type { BlogPost } from "@/lib/blog-post-model";
import type { MirotechJournalSyncResult } from "@/lib/dual-brand/sync-journal";

export type BlogMirotechSyncOutcome = {
  posts: BlogPost[];
  results: MirotechJournalSyncResult[];
};
