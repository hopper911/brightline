"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/studio/Panel";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { UpgradePrompt } from "@/components/studio/UpgradePrompt";
import type { AutomationRule } from "@/lib/automation/types";
import type { Approval } from "@/lib/approvals/store";
import type { EventRecord } from "@/lib/events/logger";

type Props = {
  rules: AutomationRule[];
  pendingApprovals: Approval[];
  recentEvents: EventRecord[];
  visualOnly: boolean;
  canUseAutomation: boolean;
};

export function AutomationRoom({ rules, pendingApprovals, recentEvents, visualOnly, canUseAutomation }: Props) {
  const [localRules, setLocalRules] = useState<AutomationRule[]>(rules);

  const activeCount = useMemo(() => localRules.filter((r) => r.isActive).length, [localRules]);

  function toggleRule(id: string) {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  }

  return (
    <main className="min-h-screen bg-studio-bg text-white/90">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
            Bright Line Studio OS
          </p>
          <h1 className="mt-2 font-display text-2xl font-medium tracking-tight text-white/95 sm:text-3xl">
            Automation
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Approval-driven automation: rules prepare drafts and reminders, never send or execute externally.
          </p>
        </header>

        {visualOnly && (
          <Panel padding="base" className="mb-6 border-accent-border/30 bg-accent-glow/20">
            <SectionHeader
              title="Vercel visual-only"
              subtitle="Automation persistence and approvals are available in local mode."
            />
          </Panel>
        )}

        {!canUseAutomation && (
          <div className="mb-6">
            <UpgradePrompt
              title="Upgrade to unlock automation"
              description="Enable approval-driven workflows that prepare drafts and reminders."
              ctaLabel="View plans"
              ctaHref="/studio/settings"
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel padding="base">
            <SectionHeader
              title="Rules"
              subtitle={`${activeCount} active`}
            />
            <div className="mt-4 space-y-3">
              {localRules.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-4 rounded-studio-base border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white/90">{r.name}</p>
                    <p className="mt-1 text-xs text-white/50">
                      Trigger: <span className="text-white/70">{r.trigger}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-white/50">
                      Action: <span className="text-white/70">{r.action}</span>
                      {r.requiresApproval ? " (requires approval)" : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={visualOnly || !canUseAutomation}
                    onClick={() => toggleRule(r.id)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 ${
                      r.isActive
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    } ${visualOnly || !canUseAutomation ? "opacity-60" : ""}`}
                    aria-label={r.isActive ? `Disable ${r.name}` : `Enable ${r.name}`}
                  >
                    {r.isActive ? "On" : "Off"}
                  </button>
                </div>
              ))}
              <p className="pt-2 text-xs text-white/45">
                Rule toggles are local UI state for now. Next step is persisting rule state (local SQLite) with full audit trail.
              </p>
            </div>
          </Panel>

          <Panel padding="base">
            <SectionHeader
              title="Pending automation approvals"
              subtitle={pendingApprovals.length > 0 ? `${pendingApprovals.length} pending` : "None"}
            />
            <div className="mt-4">
              {pendingApprovals.length === 0 ? (
                <p className="text-sm text-white/55">No pending automation approvals.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingApprovals.slice(0, 8).map((a) => (
                    <li
                      key={a.id}
                      className="rounded-studio-base border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white/85">{a.actionType.replace(/_/g, " ")}</span>
                        <span className="text-[10px] uppercase tracking-wider text-amber-300">pending</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">Room: {a.room}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel padding="base">
            <SectionHeader title="Recent automation activity" subtitle="Logged events (read-only)" />
            <div className="mt-4">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-white/55">No automation events yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentEvents.slice(0, 12).map((e) => (
                    <li
                      key={e.id}
                      className="rounded-studio-base border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white/85">{e.summary}</span>
                        <span className="text-[10px] text-white/45">{new Date(e.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-white/50">
                        {e.type} · {e.status}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

