import type { AgentScope } from "@/lib/platform/authorization/agent-scopes";
import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import type {
  AuthorizationCheckInput,
  AuthorizationSubject,
  ListPermissionsInput,
} from "@/lib/platform/authorization/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export interface AuthorizationService {
  can(input: AuthorizationCheckInput): Promise<boolean>;
  requirePermission(input: AuthorizationCheckInput): Promise<void>;
  listPermissions(input: ListPermissionsInput): Promise<PlatformPermission[]>;
  permissionAllowedByAgentScope(scope: AgentScope, permission: PlatformPermission): boolean;
  filterPermissionsForTenant(
    permissions: PlatformPermission[],
    tenant: TenantSlug
  ): PlatformPermission[];
}

export type PlatformAuthorizationService = AuthorizationService;

export type { AuthorizationSubject, AuthorizationCheckInput, ListPermissionsInput };
