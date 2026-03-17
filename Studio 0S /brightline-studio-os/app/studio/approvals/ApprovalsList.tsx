"use client";

import { useState, useEffect } from "react";
import { approve, reject, fetchPendingApprovals, type ApprovalRecord } from "./actions";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";

export function ApprovalsList() {
  const [items, setItems] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const list = await fetchPendingApprovals();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(id: string) {
    const res = await approve(id);
    if (res.ok) await load();
  }

  async function handleReject(id: string) {
    const res = await reject(id);
    if (res.ok) await load();
  }

  if (loading) {
    return (
      <div className="animate-pulse rounded-studio-xl border border-white/[0.05] bg-white/[0.02] p-8">
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending approvals"
        description="Approval requests from Reception and Marketing will appear here when ready for sign-off."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id}>
          <Panel padding="base">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
                {a.room} · {a.actionType}
              </p>
              {a.payloadJson && (
                <pre className="mt-2 max-h-24 overflow-auto rounded-studio-base border border-white/[0.05] bg-black/20 p-2 text-xs text-white/75">
                  {JSON.stringify(JSON.parse(a.payloadJson), null, 2)}
                </pre>
              )}
              <p className="mt-2 text-[11px] text-white/40">{a.createdAt}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleApprove(a.id)}
                className="rounded-studio-base border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300/90 transition-colors hover:bg-emerald-400/15"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject(a.id)}
                className="rounded-studio-base border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-300/90 transition-colors hover:bg-rose-400/15"
              >
                Reject
              </button>
            </div>
          </div>
          </Panel>
        </li>
      ))}
    </ul>
  );
}
