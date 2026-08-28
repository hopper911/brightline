import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import type { PlatformContext } from "@/lib/platform/context/types";
import type { DefaultJobService } from "@/lib/platform/jobs/default-job-service";
import { defaultJobService } from "@/lib/platform/jobs/default-job-service";
import {
  buildPublishingMirotechHubPatchIdempotencyKey,
  buildPublishingMirotechJournalIdempotencyKey,
  hashPublishingContentVersion,
  publishingHubPatchJobPayload,
  publishingJobPayload,
} from "@/lib/platform/jobs/publishing-payload";
import {
  PUBLISHING_MIROTECH_HUB_PATCH_JOB,
  PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
  type JobStatus,
} from "@/lib/platform/jobs/types";
import type { PublishOperation, PublishTargetId } from "@/lib/platform/publishing/types";

export type EnqueuePublishingJobResult = {
  jobId: string;
  accepted: true;
  reused?: boolean;
  status?: JobStatus;
};

export async function enqueueMirotechJournalSyncJob(input: {
  context: PlatformContext;
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  contentVersion: string;
  actor: PlatformAuditActor;
  jobService?: DefaultJobService;
}): Promise<EnqueuePublishingJobResult> {
  const jobService = input.jobService ?? defaultJobService;
  const idempotencyKey = buildPublishingMirotechJournalIdempotencyKey({
    source: input.source,
    target: input.target,
    operation: input.operation,
    contentVersion: input.contentVersion,
  });

  await recordAuditSafely({
    context: input.context,
    actor: input.actor,
    action: "publishing.queued",
    resource: { type: input.source.type, id: input.source.id },
    metadata: {
      target: input.target,
      operation: input.operation,
      contentVersion: input.contentVersion,
      idempotencyKey,
    },
  });

  const enqueued = await jobService.enqueue(input.context, {
    type: PUBLISHING_MIROTECH_JOURNAL_SYNC_JOB,
    idempotencyKey,
    payload: publishingJobPayload({
      source: input.source,
      target: input.target,
      operation: input.operation,
      contentVersion: input.contentVersion,
      actor: input.actor,
    }),
  });

  return { jobId: enqueued.jobId, accepted: true, reused: enqueued.reused, status: enqueued.status };
}

export async function enqueueMirotechHubPatchJob(input: {
  context: PlatformContext;
  source: ContentRef;
  target: PublishTargetId;
  operation: PublishOperation;
  hubPatch: Record<string, unknown>;
  actor: PlatformAuditActor;
  jobService?: DefaultJobService;
}): Promise<EnqueuePublishingJobResult> {
  const jobService = input.jobService ?? defaultJobService;
  const contentVersion = hashPublishingContentVersion(input.hubPatch);
  const idempotencyKey = buildPublishingMirotechHubPatchIdempotencyKey({
    source: input.source,
    target: input.target,
    operation: input.operation,
    contentVersion,
  });

  await recordAuditSafely({
    context: input.context,
    actor: input.actor,
    action: "publishing.queued",
    resource: { type: input.source.type, id: input.source.id },
    metadata: {
      target: input.target,
      operation: input.operation,
      contentVersion,
      idempotencyKey,
    },
  });

  const enqueued = await jobService.enqueue(input.context, {
    type: PUBLISHING_MIROTECH_HUB_PATCH_JOB,
    idempotencyKey,
    payload: publishingHubPatchJobPayload({
      source: input.source,
      target: input.target,
      operation: input.operation,
      contentVersion,
      hubPatch: input.hubPatch,
      actor: input.actor,
    }),
  });

  return { jobId: enqueued.jobId, accepted: true, reused: enqueued.reused, status: enqueued.status };
}
