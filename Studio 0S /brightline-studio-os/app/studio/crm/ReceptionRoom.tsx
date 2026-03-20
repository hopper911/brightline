"use client";

import { useState } from "react";
import { analyzeInquiry, type ReceptionAnalysisResult } from "./actions";
import { Spinner } from "@/components/ui/Spinner";
import { Panel } from "@/components/studio/Panel";

export function ReceptionRoom() {
  const [result, setResult] = useState<ReceptionAnalysisResult | { error: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    try {
      const res = await analyzeInquiry(formData);
      setResult(res);
    } finally {
      setPending(false);
    }
  }

  const isError = result !== null && "error" in result;
  const analysis = result !== null && !isError ? (result as ReceptionAnalysisResult) : null;

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <label htmlFor="inquiry" className="block text-sm font-medium text-white/70">
          Inquiry
        </label>
        <textarea
          id="inquiry"
          name="inquiry"
          rows={4}
          placeholder="Paste or type a lead inquiry..."
          className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/95 placeholder-white/40 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent-border/50 transition-colors duration-180"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2.5 text-sm font-medium text-white/95 transition-all duration-180 hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending && <Spinner />}
          {pending ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {isError && result && (
        <Panel padding="base" className="border-rose-500/20 bg-rose-500/5">
          <p className="text-sm text-rose-300/90" role="alert">
            {(result as { error: string }).error}
          </p>
        </Panel>
      )}

      {analysis && (
        <Panel padding="base" className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
              Analysis result
            </p>
            {analysis.source && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                  analysis.source === "ollama"
                    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300/90"
                    : "border border-amber-400/20 bg-amber-400/10 text-amber-300/90"
                }`}
              >
                {analysis.source === "ollama" ? "AI Live" : "Fallback Mode"}
              </span>
            )}
          </div>
          <div>
            <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
              Summary
            </p>
            <p className="mt-1.5 text-sm text-white/90 leading-relaxed">{analysis.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/75">
              Tone: {analysis.tone}
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/75">
              Intent: {analysis.intent}
            </span>
            <span className="rounded-full border border-accent-border bg-accent/10 px-2.5 py-1 text-accent">
              Project: {analysis.projectType}
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-white/75">
              Confidence: {analysis.confidence}
            </span>
          </div>
          <div>
            <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
              Reply draft
            </p>
            <p className="mt-1.5 text-sm text-white/80 leading-relaxed">{analysis.replyDraft}</p>
          </div>
        </Panel>
      )}
    </div>
  );
}
