"use client";

import type { ProjectStatus } from "@prisma/client";
import { useCallback, useState } from "react";

import { projectStatusLabel, STUDIO_PROJECT_PIPELINE } from "@/lib/studio/project-status-display";

function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

type ProductionPipelineStripProps = {
  projectId: string;
  currentStatus: ProjectStatus;
  onStatusUpdated?: (status: ProjectStatus) => void;
};

export function ProductionPipelineStrip({ projectId, currentStatus, onStatusUpdated }: ProductionPipelineStripProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (next: ProjectStatus) => {
      if (next === currentStatus || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await adminFetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectStatus: next }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          project?: { status?: ProjectStatus };
          error?: string;
        };
        if (!res.ok || !json?.ok || !json.project?.status) {
          setError(json?.error ?? res.statusText ?? "Could not update stage.");
          return;
        }
        onStatusUpdated?.(json.project.status);
      } finally {
        setBusy(false);
      }
    },
    [projectId, currentStatus, busy, onStatusUpdated],
  );

  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-black/45">Production pipeline</p>
        {busy ? <span className="text-[0.65rem] text-black/40">Saving…</span> : null}
      </div>
      {error ? (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {STUDIO_PROJECT_PIPELINE.map((s, i) => {
          const active = s === currentStatus;
          const past = STUDIO_PROJECT_PIPELINE.indexOf(s) < STUDIO_PROJECT_PIPELINE.indexOf(currentStatus);
          return (
            <button
              key={s}
              type="button"
              disabled={busy}
              onClick={() => apply(s)}
              className={[
                "shrink-0 rounded-lg border px-2.5 py-1.5 text-[0.7rem] font-medium transition-colors",
                active
                  ? "border-amber-500/55 bg-amber-500/10 text-amber-950"
                  : past
                    ? "border-black/12 bg-white text-black/75 hover:border-black/25"
                    : "border-black/8 bg-black/[0.02] text-black/40 hover:border-black/15 hover:text-black/60",
              ].join(" ")}
              title={projectStatusLabel(s)}
            >
              <span className="tabular-nums opacity-40">{i + 1}.</span> {projectStatusLabel(s)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
