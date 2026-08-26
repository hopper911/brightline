import { GeneratedDocumentStatus } from "@prisma/client";

const ALLOWED: Record<GeneratedDocumentStatus, GeneratedDocumentStatus[]> = {
  [GeneratedDocumentStatus.DRAFT]: [GeneratedDocumentStatus.GENERATED, GeneratedDocumentStatus.ARCHIVED],
  [GeneratedDocumentStatus.GENERATED]: [
    GeneratedDocumentStatus.SENT,
    GeneratedDocumentStatus.DRAFT,
    GeneratedDocumentStatus.ARCHIVED,
  ],
  [GeneratedDocumentStatus.SENT]: [
    GeneratedDocumentStatus.VIEWED,
    GeneratedDocumentStatus.EXPIRED,
    GeneratedDocumentStatus.DECLINED,
    GeneratedDocumentStatus.ARCHIVED,
  ],
  [GeneratedDocumentStatus.VIEWED]: [
    GeneratedDocumentStatus.SIGNED,
    GeneratedDocumentStatus.DECLINED,
    GeneratedDocumentStatus.EXPIRED,
    GeneratedDocumentStatus.ARCHIVED,
  ],
  [GeneratedDocumentStatus.SIGNED]: [GeneratedDocumentStatus.ARCHIVED],
  [GeneratedDocumentStatus.DECLINED]: [GeneratedDocumentStatus.ARCHIVED],
  [GeneratedDocumentStatus.EXPIRED]: [GeneratedDocumentStatus.ARCHIVED],
  [GeneratedDocumentStatus.ARCHIVED]: [],
};

export function canTransitionDocumentStatus(
  from: GeneratedDocumentStatus,
  to: GeneratedDocumentStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertDocumentTransition(
  from: GeneratedDocumentStatus,
  to: GeneratedDocumentStatus
): void {
  if (!canTransitionDocumentStatus(from, to)) {
    throw Object.assign(new Error(`Invalid document status transition ${from} → ${to}`), { status: 400 });
  }
}

/** Client signing is allowed only in these statuses. */
export function statusAllowsClientSign(status: GeneratedDocumentStatus): boolean {
  return status === GeneratedDocumentStatus.SENT || status === GeneratedDocumentStatus.VIEWED;
}

export function statusAllowsClientView(status: GeneratedDocumentStatus): boolean {
  return (
    status === GeneratedDocumentStatus.SENT ||
    status === GeneratedDocumentStatus.VIEWED ||
    status === GeneratedDocumentStatus.SIGNED
  );
}
