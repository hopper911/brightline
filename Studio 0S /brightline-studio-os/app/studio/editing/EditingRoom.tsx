"use client";

import { useState } from "react";
import { scanFolder, type ImageScanResult } from "./actions";
import { Spinner } from "@/components/ui/Spinner";
import { Panel } from "@/components/studio/Panel";

export function EditingRoom() {
  const [result, setResult] = useState<ImageScanResult | { error: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    try {
      const res = await scanFolder(formData);
      setResult(res);
    } finally {
      setPending(false);
    }
  }

  const isError = result !== null && "error" in result;
  const scan = result !== null && !isError ? (result as ImageScanResult) : null;

  return (
    <div className="space-y-6">
      <form action={handleSubmit} className="space-y-4">
        <label htmlFor="folderPath" className="block text-sm font-medium text-white/70">
          Folder path
        </label>
        <input
          id="folderPath"
          name="folderPath"
          type="text"
          placeholder="/path/to/images"
          className="w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/95 placeholder-white/40 focus:border-accent-border focus:outline-none focus:ring-1 focus:ring-accent-border/50 transition-colors duration-180 disabled:opacity-50"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-studio-base border border-accent-border bg-accent/10 px-4 py-2.5 text-sm font-medium text-white/95 transition-all duration-180 hover:bg-accent/15 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending && <Spinner />}
          {pending ? "Scanning…" : "Scan"}
        </button>
      </form>

      {isError && result && (
        <Panel padding="base" className="border-rose-500/20 bg-rose-500/5" role="alert">
          <p className="text-sm text-rose-300/90">{(result as { error: string }).error}</p>
        </Panel>
      )}

      {scan && (
        <Panel padding="base" className="space-y-4" aria-live="polite">
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
            Scan result
          </p>
          <p className="font-display text-xl font-medium text-white/95">
            {scan.total_images} image{scan.total_images !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-studio-base border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
                Blurry
              </p>
              <p className="mt-1 font-display text-lg font-medium text-amber-300/90">
                {scan.blurry_images.length}
              </p>
              {scan.blurry_images.length > 0 && (
                <ul className="mt-2 max-h-24 overflow-auto text-xs text-white/65">
                  {scan.blurry_images.slice(0, 10).map((f) => (
                    <li key={f} className="truncate">{f}</li>
                  ))}
                  {scan.blurry_images.length > 10 && (
                    <li className="text-white/45">+{scan.blurry_images.length - 10} more</li>
                  )}
                </ul>
              )}
            </div>
            <div className="rounded-studio-base border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
                Low resolution
              </p>
              <p className="mt-1 font-display text-lg font-medium text-amber-300/90">
                {scan.low_resolution.length}
              </p>
              {scan.low_resolution.length > 0 && (
                <ul className="mt-2 max-h-24 overflow-auto text-xs text-white/65">
                  {scan.low_resolution.slice(0, 10).map((f) => (
                    <li key={f} className="truncate">{f}</li>
                  ))}
                  {scan.low_resolution.length > 10 && (
                    <li className="text-white/45">+{scan.low_resolution.length - 10} more</li>
                  )}
                </ul>
              )}
            </div>
            <div className="rounded-studio-base border border-white/[0.05] bg-white/[0.02] p-3">
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
                Possible duplicates
              </p>
              <p className="mt-1 font-display text-lg font-medium text-accent">
                {scan.possible_duplicates.length} group{scan.possible_duplicates.length !== 1 ? "s" : ""}
              </p>
              {scan.possible_duplicates.length > 0 && (
                <ul className="mt-2 max-h-24 overflow-auto text-xs text-white/65">
                  {scan.possible_duplicates.slice(0, 5).map((group, i) => (
                    <li key={i} className="truncate">{group.join(", ")}</li>
                  ))}
                  {scan.possible_duplicates.length > 5 && (
                    <li className="text-white/45">+{scan.possible_duplicates.length - 5} more groups</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
