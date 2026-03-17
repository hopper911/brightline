"use client";

import { useState, useEffect } from "react";
import {
  getOllamaStatus,
  refreshOllamaStatus,
  getWorkspaceSettingsSummary,
  setAiMode,
  type OllamaStatusResult,
  type WorkspaceSettingsSummary,
} from "./actions";
import { Panel } from "@/components/studio/Panel";

export function SettingsContent() {
  const [status, setStatus] = useState<OllamaStatusResult | null>(null);
  const [summary, setSummary] = useState<WorkspaceSettingsSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingMode, setSavingMode] = useState<"local" | "fallback" | null>(null);

  async function load() {
    const [ai, ws] = await Promise.all([getOllamaStatus(), getWorkspaceSettingsSummary()]);
    setStatus(ai);
    setSummary(ws);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      setStatus(await refreshOllamaStatus());
      setSummary(await getWorkspaceSettingsSummary());
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSetMode(mode: "local" | "fallback") {
    setSavingMode(mode);
    try {
      await setAiMode(mode);
      setSummary(await getWorkspaceSettingsSummary());
    } finally {
      setSavingMode(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (status === null || summary === null) {
    return (
      <div className="mt-6 animate-pulse rounded-studio-xl border border-white/[0.05] bg-white/[0.02] p-6">
        <p className="text-sm text-white/40">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <Panel padding="base" className="space-y-4">
        <h2 className="font-display text-sm font-medium uppercase tracking-[0.15em] text-white/55">
          Workspace
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Name</span>
            <span className="text-sm text-white/85">{summary.workspace.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Workspace ID</span>
            <span className="text-xs text-white/55">{summary.workspace.id}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Created</span>
            <span className="text-sm text-white/85">
              {new Date(summary.workspace.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Panel>

      <Panel padding="base" className="space-y-4">
        <h2 className="font-display text-sm font-medium uppercase tracking-[0.15em] text-white/55">
          Usage & limits
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Plan</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-white/70">
              {summary.usage.limits.plan}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Projects</p>
              <p className="mt-1 text-sm text-white/90">
                {summary.usage.counts.projects} / {summary.usage.limits.maxProjects}
              </p>
            </div>
            <div className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Drafts</p>
              <p className="mt-1 text-sm text-white/90">
                {summary.usage.counts.drafts} / {summary.usage.limits.maxDrafts}
              </p>
            </div>
            <div className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Automations</p>
              <p className="mt-1 text-sm text-white/90">
                {summary.usage.counts.activeAutomations} / {summary.usage.limits.maxActiveAutomations}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Agent usage</p>
              <p className="mt-1 text-sm text-white/90">{summary.usage.usageTotals.agentUsage}</p>
            </div>
            <div className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Drafts generated</p>
              <p className="mt-1 text-sm text-white/90">{summary.usage.usageTotals.draftsGenerated}</p>
            </div>
            <div className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/45">Workflows triggered</p>
              <p className="mt-1 text-sm text-white/90">{summary.usage.usageTotals.workflowsTriggered}</p>
            </div>
          </div>

          <p className="text-xs text-white/40">
            Limits are currently <span className="text-white/55">track-only</span>.
          </p>
        </div>
      </Panel>

      <Panel padding="base" className="space-y-4">
        <h2 className="font-display text-sm font-medium uppercase tracking-[0.15em] text-white/55">
          Local AI (Ollama)
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Status</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                status.available
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300/90"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-300/90"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status.available ? "bg-emerald-400/90" : "bg-amber-400/90"
                }`}
              />
              {status.available ? "Connected" : "Unavailable"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Preferred model</span>
            <span className="text-sm text-white/85">{status.model}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/65">Fallback mode</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                status.fallbackMode
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-300/90"
                  : "border-white/[0.08] bg-white/[0.03] text-white/60"
              }`}
            >
              {status.fallbackMode ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-2 rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
        >
          {refreshing ? "Checking…" : "Refresh status"}
        </button>
      </Panel>

      <Panel padding="base" className="space-y-4">
        <h2 className="font-display text-sm font-medium uppercase tracking-[0.15em] text-white/55">
          AI mode
        </h2>
        <p className="text-sm text-white/55">
          Preference only. The runtime still uses Ollama when available and falls back automatically.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSetMode("local")}
            disabled={savingMode !== null}
            className={`rounded-studio-base border px-4 py-2 text-sm font-medium transition-colors ${
              summary.aiMode === "local"
                ? "border-accent/30 bg-accent/15 text-white/90"
                : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
            }`}
          >
            {savingMode === "local" ? "Saving…" : "Local"}
          </button>
          <button
            type="button"
            onClick={() => handleSetMode("fallback")}
            disabled={savingMode !== null}
            className={`rounded-studio-base border px-4 py-2 text-sm font-medium transition-colors ${
              summary.aiMode === "fallback"
                ? "border-amber-400/20 bg-amber-400/10 text-amber-200/90"
                : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
            }`}
          >
            {savingMode === "fallback" ? "Saving…" : "Fallback"}
          </button>
        </div>
      </Panel>
      <p className="text-xs text-white/40">
        When Ollama is unavailable, the app uses template-based fallbacks. No cloud APIs or external services are used.
      </p>
    </div>
  );
}
