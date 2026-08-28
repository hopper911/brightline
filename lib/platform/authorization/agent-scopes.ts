import type { PlatformPermission } from "@/lib/platform/authorization/permissions";

/** Explicit permission list for future agent/service principals (Phase 8B — no agents yet). */
export type AgentScope = readonly PlatformPermission[];

/** Agent may draft case studies and read media — not publish or manage identity. */
export const AGENT_SCOPE_CASE_STUDY_DRAFTER: AgentScope = [
  "mirotech.case-study.draft",
  "mirotech.project.read",
  "platform.media.read",
] as const;

/** Read-only media audit agent. */
export const AGENT_SCOPE_MEDIA_READER: AgentScope = ["platform.media.read", "platform.audit.read"] as const;

export const AGENT_SCOPE_PRESETS = {
  caseStudyDrafter: AGENT_SCOPE_CASE_STUDY_DRAFTER,
  mediaReader: AGENT_SCOPE_MEDIA_READER,
} as const;

export type AgentScopePresetId = keyof typeof AGENT_SCOPE_PRESETS;

export function permissionAllowedByAgentScope(
  scope: AgentScope,
  permission: PlatformPermission
): boolean {
  return scope.includes(permission);
}

export function agentScopePreset(id: AgentScopePresetId): AgentScope {
  return AGENT_SCOPE_PRESETS[id];
}
