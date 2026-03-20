import type { AutomationRule } from "@/lib/automation/types";

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule_new_inquiry_draft_reply",
    name: "New inquiry → draft reply",
    trigger: "new inquiry analyzed",
    condition: "true",
    action: "generate reply draft",
    requiresApproval: true,
    isActive: true,
  },
  {
    id: "rule_proposal_followup_reminder",
    name: "Proposal sent → 2-day follow-up reminder",
    trigger: "proposal sent",
    condition: "projectId exists",
    action: "create reminder",
    requiresApproval: true,
    isActive: true,
  },
];

