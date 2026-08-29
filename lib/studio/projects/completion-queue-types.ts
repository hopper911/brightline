import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import type { ProjectWorkflowPriority } from "@/lib/platform/projects/workflow-state";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import type { CompletionQueueSectionId } from "@/lib/studio/projects/completion-queue-sections";

export type CompletionQueueQuickActions = {
  edit: boolean;
  media: boolean;
  preview: boolean;
  submitReview: boolean;
  publish: boolean;
};

export type CompletionQueueItem = {
  id: string;
  tenant: TenantSlug;
  kind: "work-project" | "mirotech-case-study";
  title: string;
  slug: string;
  lifecycle: ProjectWorkflowLifecycle;
  lifecycleLabel: string;
  priority: ProjectWorkflowPriority;
  completenessScore: number;
  missing: string[];
  friendlyMissing: string[];
  blockers: {
    content: string[];
    media: string[];
    seo: string[];
  };
  published: boolean;
  updatedAt: string;
  editHref: string;
  mediaHref: string;
  previewHref: string | null;
  projectRefParam: string;
  publishFailedReason: string | null;
  quickActions: CompletionQueueQuickActions;
  queueSections: CompletionQueueSectionId[];
};
