/**
 * Thin audit helper — writes to the appropriate existing log table.
 * Does not invent a parallel AuditEvent mega-table.
 */
import { prisma } from "@/lib/prisma";

export type AuditActor = {
  type: "admin" | "client" | "accountant" | "system" | "public";
  id?: string | null;
  owner?: boolean;
};

export type AuditTarget =
  | { table: "gallery"; tokenId: string; action: string; imageId?: string | null; ip?: string | null; userAgent?: string | null }
  | {
      table: "package";
      deliveryPackageId: string;
      action: string;
      deliveryPackageItemId?: string | null;
      ip?: string | null;
      userAgent?: string | null;
    }
  | {
      table: "accountant";
      action: string;
      actorAccountantId?: string | null;
      actorOwner?: boolean;
      entityType?: string | null;
      entityId?: string | null;
      metadata?: unknown;
      ip?: string | null;
      userAgent?: string | null;
    }
  | {
      table: "document";
      action: string;
      documentId?: string | null;
      formSubmissionId?: string | null;
      actorType: string;
      metadata?: unknown;
      ip?: string | null;
      userAgent?: string | null;
    };

/** Fire-and-forget style: never throws to callers; logs failures to console. */
export async function auditLog(target: AuditTarget): Promise<void> {
  try {
    if (target.table === "gallery") {
      await prisma.galleryAccessLog.create({
        data: {
          tokenId: target.tokenId,
          action: target.action,
          imageId: target.imageId ?? undefined,
          ip: target.ip ?? undefined,
          userAgent: target.userAgent ?? undefined,
        },
      });
      return;
    }
    if (target.table === "package") {
      await prisma.packageAccessLog.create({
        data: {
          deliveryPackageId: target.deliveryPackageId,
          deliveryPackageItemId: target.deliveryPackageItemId ?? undefined,
          eventType: target.action,
          ipAddress: target.ip ?? undefined,
          userAgent: target.userAgent ?? undefined,
        },
      });
      return;
    }
    if (target.table === "accountant") {
      await prisma.accountantAuditLog.create({
        data: {
          actorType: target.actorOwner ? "owner" : "accountant",
          actorAccountantId: target.actorAccountantId ?? undefined,
          actorOwner: Boolean(target.actorOwner),
          action: target.action,
          entityType: target.entityType ?? undefined,
          entityId: target.entityId ?? undefined,
          metadata: target.metadata as object | undefined,
          ipAddress: target.ip ?? undefined,
          userAgent: target.userAgent ?? undefined,
        },
      });
      return;
    }
    await prisma.documentAuditLog.create({
      data: {
        documentId: target.documentId ?? undefined,
        formSubmissionId: target.formSubmissionId ?? undefined,
        actorType: target.actorType,
        action: target.action,
        metadata: target.metadata as object | undefined,
        ipAddress: target.ip ?? undefined,
        userAgent: target.userAgent ?? undefined,
      },
    });
  } catch (err) {
    console.error("auditLog failed", target.table, err);
  }
}
