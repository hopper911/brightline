import type { PublishRequest, PublishResult } from "@/lib/platform/publishing/types";

export function mapBrightlineWorkProjectPublishResult(
  request: PublishRequest,
  input: {
    resourceId: string;
    publicPath: string | null;
    revalidatedPaths: string[];
  }
): PublishResult {
  return {
    outcome: "completed",
    request,
    resourceId: input.resourceId,
    message: "Brightline work project published.",
    effects: [
      { kind: "database_updated", description: "work_projects.published=true" },
      {
        kind: "cache_revalidated",
        paths: input.revalidatedPaths,
      },
    ],
    warnings: input.publicPath ? undefined : ["Public path could not be verified after publish."],
  };
}
