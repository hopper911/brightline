import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export type DbClient = Prisma.TransactionClient | typeof prisma;

export async function appendStudioActivityLog(data: AppendStudioActivityInput, db: DbClient = prisma): Promise<void> {
  await db.studioActivityLog.create({
    data: {
      type: data.type,
      message: data.message,
      actorId: data.actorId ?? undefined,
      studioClientId: data.studioClientId ?? undefined,
      studioProjectId: data.studioProjectId ?? undefined,
      studioTaskId: data.studioTaskId ?? undefined,
      studioInvoiceId: data.studioInvoiceId ?? undefined,
      studioGalleryId: data.studioGalleryId ?? undefined,
      deliveryPackageId: data.deliveryPackageId ?? undefined,
      metadata: data.metadata ?? undefined,
    },
  });
}
