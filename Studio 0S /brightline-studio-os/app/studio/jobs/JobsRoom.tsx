"use client";

import { useState, useEffect } from "react";
import { fetchJobs, runJobsNow, scheduleDefaultJobs } from "./actions";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";
import type { Job } from "@/lib/jobs";

const JOB_LABELS: Record<string, string> = {
  summarize_recent_activity: "Summarize recent activity",
  remind_pending_approvals: "Remind pending approvals",
  remind_pending_delivery_drafts: "Remind pending delivery drafts",
  refresh_content_queue_summary: "Refresh content queue summary",
  refresh_archive_summary: "Refresh archive summary",
  daily_strategy_summary: "Daily strategy summary",
  weekly_strategy_summary: "Weekly strategy summary",
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

export function JobsRoom() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchJobs({ limit: 50 });
      setJobs(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRunNow() {
    setRunning(true);
    try {
      await runJobsNow();
      await load();
    } finally {
      setRunning(false);
    }
  }

  async function handleScheduleDefaults() {
    setScheduling(true);
    try {
      await scheduleDefaultJobs();
      await load();
    } finally {
      setScheduling(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-studio-xl border border-white/[0.05] bg-white/[0.02] p-8">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel padding="base">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/70">
            Safe local jobs: summaries and reminders only. No file changes, no email, no external systems.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleScheduleDefaults}
              disabled={scheduling}
              className="rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.05] disabled:opacity-50"
            >
              {scheduling ? "Scheduling…" : "Schedule sample jobs"}
            </button>
              <button
              type="button"
              onClick={handleRunNow}
              disabled={running}
              className="rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-accent/15 disabled:opacity-50"
            >
              {running ? "Running…" : "Run due jobs now"}
            </button>
          </div>
        </div>
      </Panel>

      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs scheduled"
          description="Jobs can be scheduled from Settings or via the API. Run due jobs to process any that are ready."
        />
      ) : (
        <ul className="space-y-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Panel padding="base">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white/95">
                      {JOB_LABELS[j.jobType] ?? j.jobType}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        j.status === "completed"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : j.status === "failed"
                            ? "bg-rose-400/15 text-rose-300"
                            : j.status === "running"
                              ? "bg-amber-400/15 text-amber-300"
                              : "bg-white/10 text-white/60"
                      }`}
                    >
                      {j.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/45">
                    Scheduled: {formatDate(j.scheduledFor)}
                    {j.lastRunAt && (
                      <> · Last run: {formatDate(j.lastRunAt)}</>
                    )}
                  </p>
                  {j.resultSummary && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded-studio-base border border-white/[0.05] bg-black/20 p-3 text-xs text-white/75 whitespace-pre-wrap">
                      {j.resultSummary}
                    </pre>
                  )}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
