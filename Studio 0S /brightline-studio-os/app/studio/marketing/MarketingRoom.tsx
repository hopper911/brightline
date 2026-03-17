"use client";

import { useState } from "react";
import type { ProjectOption } from "./actions";
import { generateCaption, generateCaseStudy } from "./actions";
import { Spinner } from "@/components/ui/Spinner";
import { Panel } from "@/components/studio/Panel";

type Output =
  | { kind: "caption"; caption: string; draftId: string; source?: "ollama" | "fallback" }
  | { kind: "caseStudy"; title: string; sections: string[]; draftId: string; source?: "ollama" | "fallback" };

export function MarketingRoom({ projects }: { projects: ProjectOption[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [output, setOutput] = useState<Output | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<"caption" | "caseStudy" | null>(null);

  async function handleCaption(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setPending(true);
    setPendingAction("caption");
    setOutput(null);
    try {
      const res = await generateCaption(projectId);
      if (!("error" in res)) {
        setOutput({ kind: "caption", caption: res.caption, draftId: res.draftId, source: res.source });
      }
    } finally {
      setPending(false);
      setPendingAction(null);
    }
  }

  async function handleCaseStudy(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setPending(true);
    setPendingAction("caseStudy");
    setOutput(null);
    try {
      const res = await generateCaseStudy(projectId);
      if (!("error" in res)) {
        setOutput({ kind: "caseStudy", title: res.title, sections: res.sections, draftId: res.draftId, source: res.source });
      }
    } finally {
      setPending(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4">
        <label htmlFor="project" className="block text-sm font-medium text-white/70">
          Project
        </label>
        <select
          id="project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/95 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent-border/50 transition-colors duration-180 disabled:opacity-50"
          disabled={pending}
        >
          {projects.length === 0 ? (
            <option value="">No projects</option>
          ) : (
            projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
        </select>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCaption}
            disabled={pending || projects.length === 0}
            className="inline-flex items-center gap-2 rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2.5 text-sm font-medium text-white/95 transition-all duration-180 hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && pendingAction === "caption" && <Spinner />}
            {pending && pendingAction === "caption" ? "Generating…" : "Generate caption"}
          </button>
          <button
            type="button"
            onClick={handleCaseStudy}
            disabled={pending || projects.length === 0}
            className="inline-flex items-center gap-2 rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/90 transition-all duration-180 hover:border-white/[0.12] hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && pendingAction === "caseStudy" && <Spinner />}
            {pending && pendingAction === "caseStudy" ? "Generating…" : "Generate case study"}
          </button>
        </div>
      </form>

      {output && (
        <Panel padding="base" className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
              Saved as draft · {output.draftId}
            </p>
            {output.source && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                  output.source === "ollama"
                    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300/90"
                    : "border border-amber-400/20 bg-amber-400/10 text-amber-300/90"
                }`}
              >
                {output.source === "ollama" ? "AI Live" : "Fallback Mode"}
              </span>
            )}
          </div>
          {output.kind === "caption" && <p className="text-sm text-white/90 leading-relaxed">{output.caption}</p>}
          {output.kind === "caseStudy" && (
            <>
              <p className="font-display font-medium text-white/95">{output.title}</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/75">
                {output.sections.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
