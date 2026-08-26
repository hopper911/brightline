import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function resolveIpUa(req?: Request | null): Promise<{ ip: string | null; ua: string | null }> {
  if (req) {
    return {
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      ua: req.headers.get("user-agent"),
    };
  }
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    ua: h.get("user-agent"),
  };
}

export async function logDocumentAudit(input: {
  documentId?: string | null;
  formSubmissionId?: string | null;
  actorType: "admin" | "client" | "system";
  action: string;
  metadata?: Prisma.InputJsonValue;
  req?: Request | null;
}): Promise<void> {
  const { documentId, formSubmissionId, actorType, action, metadata, req } = input;
  const { ip, ua } = await resolveIpUa(req);
  await prisma.documentAuditLog.create({
    data: {
      documentId: documentId ?? undefined,
      formSubmissionId: formSubmissionId ?? undefined,
      actorType,
      action,
      metadata: metadata ?? undefined,
      ipAddress: ip,
      userAgent: ua ?? undefined,
    },
  });
}
