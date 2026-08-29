"use client";

import Link from "next/link";
import { useState } from "react";
import type { CompletionQueueSectionId } from "@/lib/studio/projects/completion-queue-sections";
import { COMPLETION_QUEUE_SECTION_LABELS } from "@/lib/studio/projects/completion-queue-sections";
import type { CompletionQueueItem } from "@/lib/studio/projects/completion-queue-types";

type Props = {
  tenantFilter: string;
  sections: Record<CompletionQueueSectionId, CompletionQueueItem[]>;
  totals: Record<CompletionQueueSectionId, number>;
  canWrite: boolean;
  allowedTenants: string[];
};

const SECTION_ORDER: CompletionQueueSectionId[] = [
  "needs-content",
  "needs-media",
  "needs-seo",
  "ready-for-review",
  "approved-waiting-publish",
  "publish-failed",
  "published-needs-verification",
];

function priorityClass(priority: string): string {
  if (priority === "HIGH") return "border-rose-300/40 bg-rose-400/10 text-rose-100";
  if (priority === "LOW") return "border-white/10 bg-white/5 text-white/50";
  return "border-white/15 bg-white/5 text-white/70";
}

function QueueCard({
  item,
  canWrite,
  onPriorityChange,
}: {
  item: CompletionQueueItem;
  canWrite: boolean;
  onPriorityChange: (projectRef: string, priority: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-white">{item.title}</h4>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${priorityClass(item.priority)}`}>
              {item.priority}
            </span>
            <span className="text-xs text-white/40">{item.tenant}</span>
          </div>
          <p className="mt-1 text-xs text-white/45">{item.slug}</p>
        </div>
        <p className="tabular-nums text-sm text-white">{item.completenessScore}%</p>
      </div>

      {item.friendlyMissing.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs uppercase tracking-wider text-white/40">Missing</p>
          <ul className="mt-1 space-y-0.5 text-sm text-white/65">
            {item.friendlyMissing.map((m) => (
              <li key={m}>· {m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {item.publishFailedReason ? (
        <p className="mt-2 text-xs text-rose-200/80">Publish error: {item.publishFailedReason}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canWrite && item.quickActions.edit ? (
          <Link
            href={item.editHref}
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/75 hover:text-white"
          >
            Continue editing
          </Link>
        ) : null}
        {canWrite && item.quickActions.media ? (
          <Link
            href={item.mediaHref}
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/75 hover:text-white"
          >
            Open media
          </Link>
        ) : null}
        {item.quickActions.preview && item.previewHref ? (
          <Link
            href={item.previewHref}
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/75 hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview
          </Link>
        ) : null}
        {canWrite && item.quickActions.submitReview ? (
          <Link
            href={`${item.editHref}?workflow=review`}
            className="rounded border border-amber-300/25 px-2 py-1 text-xs text-amber-100/90 hover:text-amber-50"
          >
            Submit review
          </Link>
        ) : null}
        {canWrite && item.quickActions.publish ? (
          <Link
            href={`${item.editHref}?workflow=publish`}
            className="rounded border border-sky-300/25 px-2 py-1 text-xs text-sky-100/90 hover:text-sky-50"
          >
            Publish
          </Link>
        ) : null}
      </div>

      {canWrite ? (
        <label className="mt-3 flex items-center gap-2 text-xs text-white/50">
          Priority
          <select
            className="rounded border border-white/15 bg-black/40 px-2 py-1 text-white"
            value={item.priority}
            onChange={(e) => onPriorityChange(item.projectRefParam, e.target.value)}
          >
            <option value="HIGH">HIGH</option>
            <option value="NORMAL">NORMAL</option>
            <option value="LOW">LOW</option>
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function StudioCompletionQueue({
  tenantFilter,
  sections,
  totals,
  canWrite,
  allowedTenants,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const onPriorityChange = async (projectRef: string, priority: string) => {
    setError(null);
    try {
      const res = await fetch("/api/studio/projects/completion-queue/priority", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectRef, priority }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Priority update failed.");
      }
    } catch {
      setError("Network error.");
    }
  };

  function tenantHref(tenant: string) {
    return tenant === "all" ? "/studio/projects/completion" : `/studio/projects/completion?tenant=${tenant}`;
  }

  return (
    <div>
      {allowedTenants.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {(["all", ...allowedTenants] as const).map((t) => {
            if (t === "all" && allowedTenants.length <= 1) return null;
            const active = tenantFilter === t;
            return (
              <Link
                key={t}
                href={tenantHref(t)}
                className={`rounded-lg border px-3 py-1.5 ${
                  active
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {t === "all" ? "All" : t === "brightline" ? "Brightline" : "MiroTech"}
              </Link>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      <div className="space-y-8">
        {SECTION_ORDER.map((sectionId) => {
          const items = sections[sectionId];
          const count = totals[sectionId];
          return (
            <section key={sectionId}>
              <div className="mb-3 flex items-baseline gap-3">
                <h3 className="font-display text-lg text-white">
                  {COMPLETION_QUEUE_SECTION_LABELS[sectionId]}
                </h3>
                <span className="text-sm text-white/45">{count}</span>
              </div>
              {items.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
                  Nothing in this queue.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((item) => (
                    <QueueCard
                      key={`${item.tenant}:${item.kind}:${item.id}`}
                      item={item}
                      canWrite={canWrite}
                      onPriorityChange={onPriorityChange}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
