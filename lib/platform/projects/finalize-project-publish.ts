import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import type { PlatformContext } from "@/lib/platform/context/types";
import type { ContentRef } from "@/lib/platform/content/types";
import { setStoredProjectPublishedSnapshot } from "@/lib/platform/projects/published-snapshot";
import { setStoredProjectWorkflowState } from "@/lib/platform/projects/workflow-state";

export async function finalizeProjectPublishSuccess(input: {
  context: PlatformContext;
  actor: PlatformAuditActor;
  ref: ContentRef;
  publicPath: string | null;
  snapshot: {
    title: string;
    slug: string;
    heroKey: string | null;
    summary: string | null;
  };
  jobId?: string;
}): Promise<void> {
  const publishedAt = new Date().toISOString();

  await setStoredProjectWorkflowState(input.ref, {
    lifecycle: "PUBLISHED",
    reviewNotes: null,
    updatedAt: publishedAt,
  });

  await setStoredProjectPublishedSnapshot(input.ref, {
    title: input.snapshot.title,
    slug: input.snapshot.slug,
    publicPath: input.publicPath,
    publishedAt,
    heroKey: input.snapshot.heroKey,
    summary: input.snapshot.summary,
  });

  await recordAuditSafely({
    context: input.context,
    actor: input.actor,
    action: "project.published",
    resource: { type: input.ref.type, id: input.ref.id },
    metadata: {
      publicPath: input.publicPath,
      jobId: input.jobId ?? null,
    },
  });
}

export async function finalizeProjectPublishFailure(input: {
  context: PlatformContext;
  actor: PlatformAuditActor;
  ref: ContentRef;
  error: string;
  jobId?: string;
}): Promise<void> {
  await recordAuditSafely({
    context: input.context,
    actor: input.actor,
    action: "project.publish_failed",
    resource: { type: input.ref.type, id: input.ref.id },
    metadata: {
      error: input.error,
      jobId: input.jobId ?? null,
    },
  });
}
