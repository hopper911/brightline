import "server-only";

import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import { listPlatformPublishingJobs } from "@/lib/platform/jobs/publishing-jobs-query";
import { findPlatformJobById } from "@/lib/platform/jobs/repository";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import {
  toStudioPublishingJobView,
  type StudioPublishingJobView,
} from "@/lib/studio/publishing/sanitize-job";

export type StudioPublishingDashboard = {
  enabled: boolean;
  jobsEnabled: boolean;
  publishingEnabled: boolean;
  tenantFilter: TenantSlug | "all";
  allowedTenants: TenantSlug[];
  counts: { pending: number; running: number; completed: number; failed: number };
  jobs: StudioPublishingJobView[];
  nextCursor?: string;
};

export async function getStudioPublishingDashboard(input: {
  allowedTenants: TenantSlug[];
  tenantFilter: TenantSlug | "all";
  cursor?: string;
}): Promise<StudioPublishingDashboard> {
  const publishingEnabled = isPlatformFeatureEnabled("publishing");
  const jobsEnabled = isPlatformFeatureEnabled("jobs");
  const enabled = publishingEnabled || jobsEnabled;

  const queryTenants =
    input.tenantFilter === "all"
      ? input.allowedTenants
      : input.allowedTenants.includes(input.tenantFilter)
        ? [input.tenantFilter]
        : [];

  if (!enabled || !queryTenants.length) {
    return {
      enabled,
      jobsEnabled,
      publishingEnabled,
      tenantFilter: input.tenantFilter,
      allowedTenants: input.allowedTenants,
      counts: { pending: 0, running: 0, completed: 0, failed: 0 },
      jobs: [],
    };
  }

  const listed = await listPlatformPublishingJobs({
    tenantSlugs: queryTenants,
    limit: 30,
    cursor: input.cursor,
  });

  return {
    enabled,
    jobsEnabled,
    publishingEnabled,
    tenantFilter: input.tenantFilter,
    allowedTenants: input.allowedTenants,
    counts: listed.counts,
    jobs: listed.items.map(toStudioPublishingJobView),
    nextCursor: listed.nextCursor,
  };
}

export async function getStudioPublishingJobDetail(input: {
  allowedTenants: TenantSlug[];
  jobId: string;
}): Promise<StudioPublishingJobView | null> {
  if (!isPlatformFeatureEnabled("jobs")) return null;
  const record = await findPlatformJobById(input.jobId.trim());
  if (!record || !record.type.startsWith("publishing.")) return null;
  if (!input.allowedTenants.includes(record.tenantSlug)) return null;
  return toStudioPublishingJobView(record);
}
