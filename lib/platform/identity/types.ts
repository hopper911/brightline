/**
 * Platform identity domain types (Phase 8A).
 * Identity records — not authentication sessions.
 */

import type { TenantSlug } from "@/lib/platform/tenants/types";

export const PLATFORM_USER_STATUSES = ["ACTIVE", "INVITED", "DISABLED"] as const;

export type PlatformUserStatus = (typeof PLATFORM_USER_STATUSES)[number];

export const PLATFORM_MEMBERSHIP_ROLES = ["OWNER", "ADMIN", "EDITOR", "VIEWER"] as const;

export type PlatformMembershipRole = (typeof PLATFORM_MEMBERSHIP_ROLES)[number];

/** Known legacy auth kinds mappable to PlatformUser (explicit link required). */
export const PLATFORM_LEGACY_IDENTITY_KINDS = [
  "admin_access",
  "accountant_access",
  "automation_bearer",
] as const;

export type PlatformLegacyIdentityKind = (typeof PLATFORM_LEGACY_IDENTITY_KINDS)[number];

export type PlatformUserRecord = {
  id: string;
  email: string | null;
  name: string | null;
  status: PlatformUserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformMembershipRecord = {
  id: string;
  userId: string;
  tenantSlug: TenantSlug;
  role: PlatformMembershipRole;
  createdAt: Date;
  updatedAt: Date;
};

export type LegacyIdentityInput =
  | { kind: "admin_access" }
  | { kind: "accountant_access"; accountantAccessId: string }
  | { kind: "automation_bearer" };

/**
 * Future service principals (automation, agents) use audit actor types
 * SYSTEM / AGENT / SERVICE — not PlatformUser rows with synthetic emails.
 */
export type ServicePrincipalKind = "SYSTEM" | "AGENT" | "SERVICE";

export function isPlatformUserStatus(value: unknown): value is PlatformUserStatus {
  return typeof value === "string" && (PLATFORM_USER_STATUSES as readonly string[]).includes(value);
}

export function isPlatformMembershipRole(value: unknown): value is PlatformMembershipRole {
  return typeof value === "string" && (PLATFORM_MEMBERSHIP_ROLES as readonly string[]).includes(value);
}

export function isPlatformLegacyIdentityKind(value: string): value is PlatformLegacyIdentityKind {
  return (PLATFORM_LEGACY_IDENTITY_KINDS as readonly string[]).includes(value);
}

export function normalizePlatformEmail(email: string): string {
  return email.trim().toLowerCase();
}
