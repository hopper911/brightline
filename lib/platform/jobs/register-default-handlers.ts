import type { JobHandlerRegistry } from "@/lib/platform/jobs/job-handler-registry";
import { createPublishingMirotechJournalSyncHandler } from "@/lib/platform/jobs/handlers/publishing-mirotech-journal-sync";
import { runPlatformHealthTestJob } from "@/lib/platform/jobs/handlers/platform-health-test";
import type { JobProvider } from "@/lib/platform/jobs/job-provider";
import {
  PLATFORM_HEALTH_TEST_JOB,
  PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
} from "@/lib/platform/jobs/types";

export function registerDefaultJobHandlers(
  registry: JobHandlerRegistry,
  provider?: JobProvider
): void {
  if (!registry.has(PLATFORM_HEALTH_TEST_JOB)) {
    registry.register(PLATFORM_HEALTH_TEST_JOB, runPlatformHealthTestJob);
  }
  if (!registry.has(PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB)) {
    registry.register(
      PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
      createPublishingMirotechJournalSyncHandler(undefined, provider)
    );
  }
}
