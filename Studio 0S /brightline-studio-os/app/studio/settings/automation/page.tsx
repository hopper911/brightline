import type { Metadata } from "next";
import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import { AutomationRoom } from "./AutomationRoom";
import { getAutomationRules, getPendingAutomationApprovals, getRecentAutomationEvents } from "./actions";
import { getEntitlements } from "@/lib/billing/entitlements";

export const metadata: Metadata = {
  title: "Automation | Bright Line Studio OS",
  description: "Approval-driven automation rules, reminders, and semi-autonomous workflows",
};

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [entitlements, rules, pendingApprovals, recentEvents] = await Promise.all([
    Promise.resolve(getEntitlements()),
    getAutomationRules(),
    getPendingAutomationApprovals(),
    getRecentAutomationEvents(),
  ]);

  return (
    <AutomationRoom
      rules={rules}
      pendingApprovals={pendingApprovals}
      recentEvents={recentEvents}
      visualOnly={isVercelVisualOnly()}
      canUseAutomation={entitlements.automation}
    />
  );
}

