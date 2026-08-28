import { isPlatformFeatureEnabled } from "@/lib/platform/features";

/** Both flags required for enqueue-only publishing with client polling. */
export function isPlatformPublishingJobsAsync(): boolean {
  return isPlatformFeatureEnabled("publishing") && isPlatformFeatureEnabled("jobs");
}
