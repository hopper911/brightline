/**
 * Stable platform permission identifiers (Phase 8B).
 * Scoped by tenant namespace — brightline.* and mirotech.* require matching tenant membership.
 */

export const BRIGHTLINE_PERMISSIONS = [
  "brightline.gallery.read",
  "brightline.gallery.write",
  "brightline.client.manage",
  "brightline.journal.read",
  "brightline.journal.write",
  "brightline.journal.publish",
  "brightline.project.create",
  "brightline.project.write",
  "brightline.project.approve",
] as const;

export const MIROTECH_PERMISSIONS = [
  "mirotech.project.read",
  "mirotech.project.write",
  "mirotech.project.approve",
  "mirotech.case-study.draft",
  "mirotech.case-study.publish",
  "mirotech.journal.read",
  "mirotech.journal.write",
  "mirotech.journal.publish",
] as const;

export const PLATFORM_PERMISSIONS = [
  "platform.media.read",
  "platform.media.write",
  "platform.audit.read",
  "platform.identity.read",
  "platform.identity.manage",
] as const;

export const ALL_PLATFORM_PERMISSIONS = [
  ...BRIGHTLINE_PERMISSIONS,
  ...MIROTECH_PERMISSIONS,
  ...PLATFORM_PERMISSIONS,
] as const;

export type BrightlinePermission = (typeof BRIGHTLINE_PERMISSIONS)[number];
export type MirotechPermission = (typeof MIROTECH_PERMISSIONS)[number];
export type PlatformCrossPermission = (typeof PLATFORM_PERMISSIONS)[number];
export type PlatformPermission = (typeof ALL_PLATFORM_PERMISSIONS)[number];

const PERMISSION_SET = new Set<string>(ALL_PLATFORM_PERMISSIONS);

export function isPlatformPermission(value: string): value is PlatformPermission {
  return PERMISSION_SET.has(value);
}

/** Tenant slug implied by permission prefix (platform.* uses context tenant only). */
export function permissionTenantScope(permission: PlatformPermission): "brightline" | "mirotech" | "platform" {
  if (permission.startsWith("brightline.")) return "brightline";
  if (permission.startsWith("mirotech.")) return "mirotech";
  return "platform";
}
