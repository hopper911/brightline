import type { JobRecord } from "@/lib/platform/jobs/types";
import { readPublishingJobResult } from "@/lib/platform/jobs/publishing-payload";
import { toStudioPublishingJobView } from "@/lib/studio/publishing/sanitize-job";

/** Admin poll shape — includes hub payloads only after route-level tenant authorization. */
export function toAdminPlatformJobPollView(record: JobRecord) {
  const view = toStudioPublishingJobView(record);
  const full = readPublishingJobResult(record.payload);

  return {
    id: view.id,
    status: view.status,
    type: view.type,
    tenantSlug: view.tenantSlug,
    errorSummary: view.errorSummary,
    result: full
      ? {
          ok: full.ok,
          resourceId: full.resourceId ?? null,
          error: full.error,
          hubProject: full.hubProject,
          hubBlog: full.hubBlog,
        }
      : null,
  };
}
