import type { Prisma } from "@prisma/client";

export const STUDIO_ACTIVITY_TYPES = {
  PROJECT_STATUS_CHANGED: "project.status_changed",
  TASK_COMPLETED: "task.completed",
  DELIVERY_PACKAGE_EMAIL_SENT: "delivery_package.email_sent",
} as const;

export type AppendStudioActivityInput = {
  type: string;
  message: string;
  actorId?: string | null;
  studioClientId?: string | null;
  studioProjectId?: string | null;
  studioTaskId?: string | null;
  studioInvoiceId?: string | null;
  studioGalleryId?: string | null;
  deliveryPackageId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/** Reserved for a future StudioActivityLog table — no-op until schema ships. */
export async function appendStudioActivityLog(_data: AppendStudioActivityInput): Promise<void> {
  return;
}
