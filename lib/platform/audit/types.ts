/**
 * Platform audit event domain types (Phase 2A).
 * Operational audit trail — not analytics.
 */

import type { PlatformContext } from "@/lib/platform/context/types";

export const PLATFORM_AUDIT_ACTOR_TYPES = ["USER", "SYSTEM", "AGENT", "SERVICE"] as const;

export type PlatformAuditActorType = (typeof PLATFORM_AUDIT_ACTOR_TYPES)[number];

export type PlatformAuditActor = {
  type: PlatformAuditActorType;
  id?: string | null;
};

export type PlatformAuditResource = {
  type: string;
  id: string;
};

export type RecordPlatformAuditInput = {
  context: PlatformContext;
  actor: PlatformAuditActor;
  action: string;
  resource?: PlatformAuditResource | null;
  metadata?: Record<string, unknown> | null;
  /**
   * When true, audit write failures propagate to the caller.
   * Default false — audit must not take down customer-facing flows.
   */
  strict?: boolean;
};

export type RecordPlatformAuditResult =
  | { ok: true; skipped: true; reason: "disabled" }
  | { ok: true; skipped: false; id: string }
  | { ok: false; error: string };

export type PlatformAuditEventRecord = {
  id: string;
  tenantId: string | null;
  tenantSlug: string;
  actorType: PlatformAuditActorType;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

/** Machine-readable actions: lowercase segments separated by dots. */
export const PLATFORM_AUDIT_ACTION_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;

export function isPlatformAuditActorType(value: string): value is PlatformAuditActorType {
  return (PLATFORM_AUDIT_ACTOR_TYPES as readonly string[]).includes(value);
}

export function isValidPlatformAuditAction(action: string): boolean {
  return PLATFORM_AUDIT_ACTION_PATTERN.test(action.trim());
}
