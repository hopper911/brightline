import Link from "next/link";
import { SettingsContent } from "./SettingsContent";
import { getWorkspacePlan } from "@/lib/billing/entitlements";
import { UpgradePrompt } from "@/components/studio/UpgradePrompt";
import { Panel } from "@/components/studio/Panel";

export const metadata = {
  title: "Settings | Bright Line Studio OS",
  description: "Workspace settings, usage, and local AI preferences",
};

export default function SettingsPage() {
  const plan = getWorkspacePlan();
  const entitlements = plan.limits;

  return (
    <div className="min-h-screen bg-studio-bg p-6 text-white sm:p-8">
      <div className="mx-auto max-w-xl">
        <Link
          href="/studio"
          className="text-xs font-medium uppercase tracking-[0.1em] text-white/45 transition-colors hover:text-white/70"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-white/95 sm:text-[1.75rem]">
          Settings
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Workspace settings, usage, and local AI preferences.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition-colors hover:bg-white/[0.05]"
          >
            Open onboarding
          </Link>
        </div>

        <div className="mt-6 space-y-6">
          <Panel padding="base" className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-sm font-medium uppercase tracking-[0.15em] text-white/55">
                  Plan
                </h2>
                <p className="mt-2 font-display text-xl font-medium text-white/95">{plan.name}</p>
                <p className="mt-1 text-xs text-white/45">
                  {plan.price === 0 ? "Free" : `$${(plan.price / 100).toFixed(0)}/mo`} · Local enforcement today
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/70">
                Billing coming soon
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-studio-base border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Automation</p>
                <p className="mt-1 text-sm text-white/85">{entitlements.automation ? "Included" : "Locked"}</p>
              </div>
              <div className="rounded-studio-base border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Advanced agents</p>
                <p className="mt-1 text-sm text-white/85">{entitlements.advancedAgents ? "Included" : "Locked"}</p>
              </div>
              <div className="rounded-studio-base border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Analytics</p>
                <p className="mt-1 text-sm text-white/85">{entitlements.analytics ? "Included" : "Locked"}</p>
              </div>
            </div>
          </Panel>

          {!entitlements.automation && (
            <UpgradePrompt
              title="Upgrade to unlock automation"
              description="Turn on approval-driven workflows for drafts, reminders, and follow-ups."
              ctaLabel="Upgrade (coming soon)"
              ctaHref="/studio/settings"
            />
          )}
        </div>

        <SettingsContent />
      </div>
    </div>
  );
}
