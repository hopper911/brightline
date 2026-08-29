import "server-only";

import { recordAuditSafely } from "@/lib/platform/audit/record-safely";
import type { PlatformAuditActor } from "@/lib/platform/audit/types";
import type { AuthorizationSubject } from "@/lib/platform/authorization/types";
import type { PlatformContext } from "@/lib/platform/context/types";
import type { ContentRef } from "@/lib/platform/content/types";
import { brightlineWorkProjectPublicPath } from "@/lib/platform/content/integrations/map-brightline-content";
import { mirotechCaseStudyPublicPath } from "@/lib/platform/content/integrations/map-mirotech-content";
import { enqueueBrightlineWorkProjectPublishJob } from "@/lib/platform/jobs/publishing-enqueue";
import { enqueueMirotechHubPatchJob } from "@/lib/platform/jobs/publishing-enqueue";
import {
  finalizeProjectPublishFailure,
  finalizeProjectPublishSuccess,
} from "@/lib/platform/projects/finalize-project-publish";
import {
  ProjectWorkflowTransitionError,
  ProjectWorkflowValidationError,
} from "@/lib/platform/projects/errors";
import { assertProjectPublishAllowed } from "@/lib/platform/projects/publish-gate";
import { loadProjectWorkflowSnapshot } from "@/lib/platform/projects/workflow-snapshot";
import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import { assertProjectPublishMediaValid } from "@/lib/platform/projects/validate-publish-media";
import { defaultPublishingService } from "@/lib/platform/publishing/default-publishing-service";
import { isPlatformPublishingJobsAsync } from "@/lib/platform/publishing/is-async-publishing-jobs";
import { getSectionToPillarSlugMap } from "@/lib/work-pillar-settings";
import { prisma } from "@/lib/prisma";

export type ProjectPublishOutcome = {
  ok: boolean;
  async: boolean;
  jobId?: string;
  publicPath: string | null;
  lifecycle: ProjectWorkflowLifecycle;
  error?: string;
  missing?: string[];
};

function auditActorFromSubject(subject: AuthorizationSubject): PlatformAuditActor {
  if (subject.kind === "user") {
    return { type: "USER", id: subject.userId };
  }
  if (subject.kind === "agent") {
    return { type: "AGENT", id: subject.agentId };
  }
  return { type: "USER", id: "legacy_admin" };
}

async function brightlinePublicPath(projectId: string): Promise<string | null> {
  const project = await prisma.workProject.findUnique({
    where: { id: projectId },
    select: { slug: true, section: true, published: true },
  });
  if (!project) return null;
  const sectionToPillar = await getSectionToPillarSlugMap();
  const pillarSlug = sectionToPillar[project.section] ?? project.section.toLowerCase();
  return brightlineWorkProjectPublicPath(pillarSlug, project.slug);
}

async function syncBrightlinePublish(
  context: PlatformContext,
  ref: ContentRef,
  actor: PlatformAuditActor
): Promise<ProjectPublishOutcome> {
  const snapshot = await loadProjectWorkflowSnapshot(ref);
  const result = await defaultPublishingService.publish(context, {
    source: ref,
    target: "brightline-site",
    operation: "publish",
  });

  if (result.outcome !== "completed") {
    await finalizeProjectPublishFailure({
      context,
      actor,
      ref,
      error: result.message ?? "Brightline publish failed.",
    });
    return {
      ok: false,
      async: false,
      publicPath: null,
      lifecycle: "APPROVED",
      error: result.message ?? "Brightline publish failed.",
    };
  }

  const publicPath = await brightlinePublicPath(ref.id);
  const heroKey =
    typeof snapshot.snapshot.heroKeyFull === "string"
      ? snapshot.snapshot.heroKeyFull
      : null;

  await finalizeProjectPublishSuccess({
    context,
    actor,
    ref,
    publicPath,
    snapshot: {
      title: String(snapshot.snapshot.title ?? ""),
      slug: String(snapshot.snapshot.slug ?? ""),
      heroKey,
      summary: typeof snapshot.snapshot.summary === "string" ? snapshot.snapshot.summary : null,
    },
  });

  return {
    ok: true,
    async: false,
    publicPath,
    lifecycle: "PUBLISHED",
  };
}

async function syncMirotechPublish(
  context: PlatformContext,
  ref: ContentRef,
  actor: PlatformAuditActor
): Promise<ProjectPublishOutcome> {
  const snapshot = await loadProjectWorkflowSnapshot(ref);
  const hubRef = { tenant: "mirotech" as const, type: "dual-brand-work" as const, id: ref.id };
  const hubPatch = { status: "PUBLISHED" };

  const result = await defaultPublishingService.publish(context, {
    source: hubRef,
    target: "mirotech-site",
    operation: "publish",
    hubPatch,
  });

  if (result.outcome !== "completed") {
    await finalizeProjectPublishFailure({
      context,
      actor,
      ref,
      error: result.message ?? "Mirotech hub publish failed.",
    });
    return {
      ok: false,
      async: false,
      publicPath: null,
      lifecycle: "APPROVED",
      error: result.message ?? "Mirotech hub publish failed.",
    };
  }

  const slug = String(snapshot.snapshot.slug ?? "");
  const publicPath = slug ? mirotechCaseStudyPublicPath(slug) : null;
  const heroKey =
    typeof snapshot.snapshot.heroImage === "string" ? snapshot.snapshot.heroImage : null;

  await finalizeProjectPublishSuccess({
    context,
    actor,
    ref,
    publicPath,
    snapshot: {
      title: String(snapshot.snapshot.title ?? ""),
      slug,
      heroKey,
      summary: typeof snapshot.snapshot.summary === "string" ? snapshot.snapshot.summary : null,
    },
  });

  return {
    ok: true,
    async: false,
    publicPath,
    lifecycle: "PUBLISHED",
  };
}

/**
 * Publish an approved project through PublishingService (+ JobService when async).
 * Keeps lifecycle APPROVED until async job completes successfully.
 */
export async function publishApprovedProject(
  context: PlatformContext,
  subject: AuthorizationSubject,
  ref: ContentRef
): Promise<ProjectPublishOutcome> {
  await assertProjectPublishAllowed(ref);
  await assertProjectPublishMediaValid(ref);

  const actor = auditActorFromSubject(subject);
  const publicPathPreview =
    ref.type === "work-project"
      ? await brightlinePublicPath(ref.id)
      : ref.type === "mirotech-case-study"
        ? mirotechCaseStudyPublicPath(
            String((await loadProjectWorkflowSnapshot(ref)).snapshot.slug ?? "")
          )
        : null;

  await recordAuditSafely({
    context,
    actor,
    action: "project.publish_requested",
    resource: { type: ref.type, id: ref.id },
    metadata: { publicPath: publicPathPreview },
  });

  const asyncJobs = isPlatformPublishingJobsAsync();

  if (ref.type === "work-project" && ref.tenant === "brightline") {
    if (asyncJobs) {
      const row = await prisma.workProject.findUnique({
        where: { id: ref.id },
        select: { updatedAt: true },
      });
      const contentVersion = row?.updatedAt.toISOString() ?? new Date().toISOString();
      const enqueued = await enqueueBrightlineWorkProjectPublishJob({
        context,
        source: ref,
        target: "brightline-site",
        operation: "publish",
        contentVersion,
        actor,
        workflowRef: ref,
      });
      return {
        ok: true,
        async: true,
        jobId: enqueued.jobId,
        publicPath: publicPathPreview,
        lifecycle: "APPROVED",
      };
    }
    return syncBrightlinePublish(context, ref, actor);
  }

  if (ref.type === "mirotech-case-study" && ref.tenant === "mirotech") {
    const hubRef = { tenant: "mirotech" as const, type: "dual-brand-work" as const, id: ref.id };
    const hubPatch = { status: "PUBLISHED" };
    if (asyncJobs) {
      const enqueued = await enqueueMirotechHubPatchJob({
        context,
        source: hubRef,
        target: "mirotech-site",
        operation: "publish",
        hubPatch,
        actor,
        workflowRef: ref,
      });
      return {
        ok: true,
        async: true,
        jobId: enqueued.jobId,
        publicPath: publicPathPreview,
        lifecycle: "APPROVED",
      };
    }
    return syncMirotechPublish(context, ref, actor);
  }

  throw new ProjectWorkflowValidationError("Unsupported project type for publish.");
}

export async function publishApprovedProjectOrThrow(
  context: PlatformContext,
  subject: AuthorizationSubject,
  ref: ContentRef
): Promise<ProjectPublishOutcome> {
  const outcome = await publishApprovedProject(context, subject, ref);
  if (!outcome.ok) {
    throw new ProjectWorkflowTransitionError(
      outcome.error ?? "Project publish failed.",
      outcome.missing ?? []
    );
  }
  return outcome;
}
