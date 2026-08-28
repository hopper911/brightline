import type { MirotechJournalSyncResult } from "@/lib/dual-brand/sync-journal";
import type { BlogPost } from "@/lib/blog-post-model";

export type BlogMirotechSyncResultItem = MirotechJournalSyncResult | {
  postId: string;
  accepted: true;
  jobId: string;
};

export type BlogMirotechSyncOutcome = {
  posts: BlogPost[];
  results: BlogMirotechSyncResultItem[];
};

export function isAcceptedBlogSyncResult(
  item: BlogMirotechSyncResultItem
): item is { postId: string; accepted: true; jobId: string } {
  return "accepted" in item && item.accepted === true && typeof item.jobId === "string";
}
