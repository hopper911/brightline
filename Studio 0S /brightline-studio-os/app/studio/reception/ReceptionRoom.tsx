"use client";

import { useState } from "react";
import { analyzeInquiry, type AnalyzeResult } from "./actions";

export function ReceptionRoom() {
  const [result, setResult] = useState<AnalyzeResult | null>(null);
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

  return (
    <div className="mt-6 space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <label htmlFor="inquiry" className="block text-sm font-medium text-white/80">
          Inquiry
        </label>
        <textarea
          id="inquiry"
          name="inquiry"
          rows={4}
          placeholder="Paste or type a lead inquiry..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {pending ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {result && (
        <div
          className="rounded-xl border border-white/10 bg-white/5 p-4"
          aria-live="polite"
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/50">
            Mock analysis result
          </p>
          <p className="mt-2 text-sm text-white/90">{result.summary}</p>
          <p className="mt-2 text-xs text-white/60">
            Suggested type: {result.suggestedType} · Priority: {result.priority}
          </p>
        </div>
      )}
    </div>
  );
}
