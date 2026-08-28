export type {
  AuthorizationService,
  PlatformAuthorizationService,
  AuthorizationSubject,
  AuthorizationCheckInput,
  ListPermissionsInput,
} from "@/lib/platform/authorization/authorization-service";
export {
  AuthorizationError,
  AuthorizationDisabledError,
  PermissionDeniedError,
  isAuthorizationError,
  type AuthorizationErrorCode,
} from "@/lib/platform/authorization/errors";
export {
  ALL_PLATFORM_PERMISSIONS,
  BRIGHTLINE_PERMISSIONS,
  MIROTECH_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  isPlatformPermission,
  permissionTenantScope,
  type PlatformPermission,
  type BrightlinePermission,
  type MirotechPermission,
  type PlatformCrossPermission,
} from "@/lib/platform/authorization/permissions";
export {
  TENANT_ROLE_PERMISSIONS,
  mergeRolePermissions,
  permissionsForRole,
} from "@/lib/platform/authorization/role-permissions";
export {
  AGENT_SCOPE_PRESETS,
  AGENT_SCOPE_CASE_STUDY_DRAFTER,
  AGENT_SCOPE_MEDIA_READER,
  agentScopePreset,
  permissionAllowedByAgentScope,
  type AgentScope,
  type AgentScopePresetId,
} from "@/lib/platform/authorization/agent-scopes";
export { legacyAdminEffectivePermissions } from "@/lib/platform/authorization/legacy-admin-grant";
