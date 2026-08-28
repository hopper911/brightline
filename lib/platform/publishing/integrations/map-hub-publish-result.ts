import type { HubJournalPost, HubJournalSummary, HubProject } from "@/lib/dual-brand/studio-hub";
import type { PublishRequest, PublishResult } from "@/lib/platform/publishing/types";

const HUB_PROJECT_PATH = "/api/content/v1/projects";

export function mapHubProjectWriteToPublishResult(
  request: PublishRequest,
  project: HubProject
): PublishResult {
  return {
    outcome: "completed",
    request,
    resourceId: project.id,
    message: "Mirotech hub project updated.",
    hubProject: project as unknown as Record<string, unknown>,
    effects: [
      {
        kind: "remote_api",
        target: "mirotech-site",
        path: `${HUB_PROJECT_PATH}/${encodeURIComponent(project.id)}`,
        status: 200,
      },
    ],
  };
}

export function mapHubBlogWriteToPublishResult(
  request: PublishRequest,
  result: { post: HubJournalPost; summary: HubJournalSummary }
): PublishResult {
  return {
    outcome: "completed",
    request,
    resourceId: result.post.id,
    message: "Mirotech hub journal updated.",
    hubBlog: {
      post: result.post as unknown as Record<string, unknown>,
      summary: result.summary as unknown as Record<string, unknown>,
    },
    effects: [
      {
        kind: "remote_api",
        target: "mirotech-site",
        path: `${HUB_PROJECT_PATH}/${encodeURIComponent(request.source.id)}/blog`,
        status: 200,
      },
    ],
  };
}
