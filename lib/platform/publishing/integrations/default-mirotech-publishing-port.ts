import "server-only";

import { getBlogPostById } from "@/lib/blog-posts";
import {
  isMirotechJournalSyncConfigured,
  syncBlogPostToMirotech,
} from "@/lib/platform/publishing/mirotech/journal-ingest";
import {
  mirotechUpdateHubBlog,
  mirotechUpdateHubProject,
} from "@/lib/platform/publishing/mirotech/hub-remote-write";
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
  updateHubProject: (id, payload) => mirotechUpdateHubProject(id, payload),
  updateHubBlog: (projectId, payload) => mirotechUpdateHubBlog(projectId, payload),
};
