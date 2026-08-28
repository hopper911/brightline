import type { AgentScope } from "@/lib/platform/authorization/agent-scopes";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import type { TenantSlug } from "@/lib/platform/tenants/types";

/** Who is being authorized — user membership, legacy admin probe, or future agent scope. */
export type AuthorizationSubject =
  | { kind: "user"; userId: string }
  | { kind: "legacy_admin" }
  | { kind: "agent"; agentId: string; scope: AgentScope };

export type AuthorizationCheckInput = {
  subject: AuthorizationSubject;
  tenant: TenantSlug;
  permission: PlatformPermission;
};

export type ListPermissionsInput = {
  subject: AuthorizationSubject;
  tenant: TenantSlug;
};
