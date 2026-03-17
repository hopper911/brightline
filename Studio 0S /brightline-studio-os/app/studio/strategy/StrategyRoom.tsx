"use client";

import { useState, useEffect } from "react";
import {
  getFounderDailySummary,
  getRevenueSnapshot,
  getPipelineStatusAction,
  getPrioritiesAction,
  getRecentEventsAction,
  getLatestDailySummary,
  getLatestWeeklySummary,
} from "./actions";
import { Panel } from "@/components/studio/Panel";
import { SectionHeader } from "@/components/studio/SectionHeader";
import { CardRow } from "@/components/studio/CardRow";

type FounderSummary = {
  todaySummary: string;
  priorities: string[];
  risks: string[];
  opportunities: string[];
  insights: string[];
};

type RevenueSummary = {
  totalRevenue: number;
  projectCount: number;
  byProject: { projectId: string | null; total: number }[];
};

type PipelineStatus = {
  byStatus: Record<string, number>;
  readyForDelivery: number;
  bottlenecks: string[];
};

type RecentEvent = { room: string; summary: string; createdAt: string };

type StoredSummary = { id: string; type: string; content: string; createdAt: string } | null;

type StoredDailyData = {
  todaySummary?: string;
  priorities?: string[];
  risks?: string[];
  opportunities?: string[];
  insights?: string[];
};

function StoredDailyContent({ content }: { content: string }) {
  let data: StoredDailyData | null = null;
  try {
    data = JSON.parse(content) as StoredDailyData;
  } catch {
    return <p className="text-sm text-white/60">Invalid stored data</p>;
  }
  if (!data) return null;
  return (
    <div className="mt-3 space-y-3 text-sm text-white/85">
      {data.todaySummary && <p>{data.todaySummary}</p>}
      {data.priorities && data.priorities.length > 0 && (
        <div>
          <p className="font-display text-[10px] uppercase tracking-wider text-white/50">Priorities</p>
          <ul className="mt-1 space-y-1">
            {data.priorities.map((p, i) => (
              <li key={i}>• {p}</li>
            ))}
          </ul>
        </div>
      )}
      {data.insights && data.insights.length > 0 && (
        <div>
          <p className="font-display text-[10px] uppercase tracking-wider text-white/50">Insights</p>
          <ul className="mt-1 space-y-1">
            {data.insights.map((insight, i) => (
              <li key={i}>• {insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function StrategyRoom() {
  const [summary, setSummary] = useState<FounderSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [priorities, setPriorities] = useState<string[] | null>(null);
  const [events, setEvents] = useState<{ recent: RecentEvent[] } | null>(null);
  const [storedDaily, setStoredDaily] = useState<StoredSummary>(null);
  const [storedWeekly, setStoredWeekly] = useState<StoredSummary>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [s, r, p, pr, e, sd, sw] = await Promise.all([
          getFounderDailySummary(),
          getRevenueSnapshot(),
          getPipelineStatusAction(),
          getPrioritiesAction(),
          getRecentEventsAction(),
          getLatestDailySummary(),
          getLatestWeeklySummary(),
        ]);
        setSummary(s);
        setRevenue(r);
        setPipeline(p);
        setPriorities(pr);
        setEvents(e);
        setStoredDaily(sd);
        setStoredWeekly(sw);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Panel padding="base" className="animate-pulse">
          <div className="h-8 w-48 rounded bg-white/10" />
          <div className="mt-2 h-4 w-full max-w-md rounded bg-white/5" />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(storedDaily || storedWeekly) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {storedDaily && (
            <Panel padding="base" className="border-accent-border/20">
              <SectionHeader
                title="Latest daily summary"
                subtitle={`Generated ${new Date(storedDaily.createdAt).toLocaleString()}`}
              />
              <StoredDailyContent content={storedDaily.content} />
            </Panel>
          )}
          {storedWeekly && (
            <Panel padding="base" className="border-accent-border/20">
              <SectionHeader
                title="Latest weekly summary"
                subtitle={`Generated ${new Date(storedWeekly.createdAt).toLocaleString()}`}
              />
              <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-white/75">
                {storedWeekly.content}
              </pre>
            </Panel>
          )}
        </div>
      )}

      <Panel padding="base">
        <SectionHeader title="Today overview" subtitle="Executive snapshot (live)" />
        <p className="mt-3 text-sm text-white/85">{summary?.todaySummary ?? "No data"}</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel padding="base">
          <SectionHeader title="Revenue snapshot" />
          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <p className="text-2xl font-display font-medium text-white/95">
                ${revenue?.totalRevenue?.toLocaleString() ?? "0"}
              </p>
              <p className="text-xs text-white/50">Total revenue</p>
            </div>
            <div>
              <p className="text-2xl font-display font-medium text-white/95">
                {revenue?.projectCount ?? 0}
              </p>
              <p className="text-xs text-white/50">Projects with payments</p>
            </div>
          </div>
        </Panel>

        <Panel padding="base">
          <SectionHeader title="Pipeline status" />
          <div className="mt-3 space-y-2">
            <p className="text-sm text-white/85">
              {pipeline?.readyForDelivery ?? 0} ready for delivery
            </p>
            {pipeline?.bottlenecks && pipeline.bottlenecks.length > 0 ? (
              <ul className="space-y-1 text-sm text-amber-400/90">
                {pipeline.bottlenecks.map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-white/50">No bottlenecks</p>
            )}
          </div>
        </Panel>
      </div>

      {summary?.insights && summary.insights.length > 0 && (
        <Panel padding="base" className="border-accent-border/30 bg-accent-glow/20">
          <SectionHeader
            title="Insights"
            subtitle="Data-driven recommendations from your business history"
          />
          <ul className="mt-3 space-y-2">
            {summary.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-muted" />
                {insight}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel padding="base">
          <SectionHeader title="Priorities" />
          <ul className="mt-3 space-y-2">
            {(priorities ?? summary?.priorities ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-white/85">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-muted" />
                {item}
              </li>
            ))}
            {((priorities ?? summary?.priorities ?? []).length === 0) && (
              <li className="text-sm text-white/50">No urgent items</li>
            )}
          </ul>
        </Panel>

        <Panel padding="base">
          <SectionHeader title="Risks" />
          <ul className="mt-3 space-y-2">
            {(summary?.risks ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-400/90">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel padding="base">
          <SectionHeader title="Opportunities" />
          <ul className="mt-3 space-y-2">
            {(summary?.opportunities ?? []).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-emerald-400/90">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/60" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel padding="base">
        <SectionHeader title="Recent events" subtitle="Latest activity across rooms" />
        <div className="mt-3 space-y-2">
          {(events?.recent ?? []).map((e, i) => (
            <CardRow
              key={i}
              title={e.room}
              meta={new Date(e.createdAt).toLocaleString()}
              snippet={e.summary}
            />
          ))}
          {(events?.recent?.length ?? 0) === 0 && (
            <p className="text-sm text-white/50">No recent events</p>
          )}
        </div>
      </Panel>

      <p className="text-[10px] text-white/40">
        Read-only dashboard. No bank connection, no auto-send. Local data only.
      </p>
    </div>
  );
}
