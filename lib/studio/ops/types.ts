import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import type { PlatformMembershipRole } from "@/lib/platform/identity/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export type StudioOpsSectionId =
  | "overview"
  | "brightline"
  | "mirotech"
  | "content"
  | "media"
  | "publishing"
  | "system";

export type StudioOpsNavItem = {
  id: StudioOpsSectionId;
  label: string;
  href: string;
  description: string;
};

export type StudioOpsToolLink = {
  label: string;
  description: string;
  href: string;
  external?: boolean;
  permission?: PlatformPermission;
};

export type StudioOpsMembership = {
  tenantSlug: TenantSlug;
  role: PlatformMembershipRole;
};

export type StudioOpsContext = {
  ok: true;
  subjectKind: "legacy_admin" | "platform_user";
  userId: string | null;
  email: string | null;
  activeTenant: TenantSlug;
  memberships: StudioOpsMembership[];
  permissions: PlatformPermission[];
  identityEnabled: boolean;
  ssoAvailable: boolean;
  legacyHandoffEnabled: boolean;
  sections: StudioOpsSectionId[];
  platformFlags: Record<string, boolean>;
  systemStatus: {
    identity: "ok" | "disabled" | "misconfigured";
    sso: "ok" | "disabled" | "misconfigured";
    publishing: "ok" | "disabled" | "misconfigured";
    jobs: "ok" | "disabled";
  };
};
