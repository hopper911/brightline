"use client";

import { useState } from "react";
import type { ProjectOption } from "./actions";
import { generateCaption } from "./actions";

interface MarketingRoomProps {
  projects: ProjectOption[];
}

export function MarketingRoom({ projects }: MarketingRoomProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [output, setOutput] = useState<{ caption: string; draftId: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setPending(true);
    setOutput(null);
    try {
      const res = await generateCaption(projectId);
      setOutput(res);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="project" className="block text-sm font-medium text-white/80">
          Project
        </label>
        <select
          id="project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
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
        <button
          type="submit"
          disabled={pending || projects.length === 0}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate caption"}
        </button>
      </form>

      {output && (
        <div
          className="rounded-xl border border-white/10 bg-white/5 p-4"
          aria-live="polite"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
            Mock output (saved as draft)
          </p>
          <p className="mt-2 text-sm text-white/90">{output.caption}</p>
          <p className="mt-2 text-xs text-white/60">Draft id: {output.draftId}</p>
        </div>
      )}
    </div>
  );
}
