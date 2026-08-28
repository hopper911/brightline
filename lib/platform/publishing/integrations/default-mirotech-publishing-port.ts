import "server-only";

import { getBlogPostById } from "@/lib/blog-posts";
import {
  isMirotechJournalSyncConfigured,
  syncBlogPostToMirotech,
} from "@/lib/dual-brand/sync-journal";
import type {
  MirotechPublishingReadPort,
  MirotechPublishingWritePort,
} from "@/lib/platform/publishing/integrations/mirotech-publishing-port";

export const defaultMirotechPublishingReadPort: MirotechPublishingReadPort = {
  getBlogPostById: (id) => getBlogPostById(id),
};

export const defaultMirotechPublishingWritePort: MirotechPublishingWritePort = {
  isJournalSyncConfigured: () => isMirotechJournalSyncConfigured(),
  syncBlogPostToMirotech: (post) => syncBlogPostToMirotech(post),
};
