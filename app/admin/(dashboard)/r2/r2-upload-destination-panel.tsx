"use client";

import { useEffect, useMemo, useState } from "react";
import {
  R2_UPLOAD_QUALITY_OPTIONS,
  R2_UPLOAD_SITE_OPTIONS,
  formatUploadDestinationLabel,
  normalizeUploadDestination,
  projectOptionsForRoot,
  resolveUploadPrefix,
  type R2UploadDestination,
  type R2UploadQuality,
} from "@/lib/r2-upload-destination";
import type { T9MediaRoot } from "@/lib/t9-media-root";
import { defaultSegmentForRoot } from "@/lib/t9-media-segments";

type Step = 1 | 2 | 3;

type Props = {
  value: R2UploadDestination;
  onChange: (next: R2UploadDestination) => void;
  /** Mobile wizard sheet open */
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
  /** After folder step on mobile — parent can open file picker */
  onReadyToPick?: () => void;
  disabled?: boolean;
  /** Compact always-visible bar (md+) vs mobile triggers sheet */
  className?: string;
};

function selectClassName() {
  return "min-w-0 flex-1 rounded border border-white/15 bg-black/40 px-2.5 py-2 text-sm text-white outline-none focus:border-white/35 disabled:opacity-40";
}

function microLabel(text: string) {
  return (
    <span className="mb-1 block text-[0.6rem] uppercase tracking-[0.2em] text-white/45">
      {text}
    </span>
  );
}

export default function R2UploadDestinationPanel({
  value,
  onChange,
  sheetOpen = false,
  onSheetOpenChange,
  onReadyToPick,
  disabled = false,
  className = "",
}: Props) {
  const dest = normalizeUploadDestination(value, "all");
  const projects = useMemo(() => projectOptionsForRoot(dest.root), [dest.root]);
  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    if (sheetOpen) setStep(1);
  }, [sheetOpen]);

  function setRoot(root: T9MediaRoot) {
    const segment = defaultSegmentForRoot(root);
    onChange(normalizeUploadDestination({ ...dest, root, segment }, "all"));
  }

  function setSegment(segment: string) {
    onChange(normalizeUploadDestination({ ...dest, segment }, "all"));
  }

  function setQuality(quality: R2UploadQuality) {
    onChange(normalizeUploadDestination({ ...dest, quality }, "all"));
  }

  const statusLine = formatUploadDestinationLabel(dest);
  const prefixPreview = resolveUploadPrefix(dest);

  const fields = (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-3">
      <label className="block min-w-[10rem] flex-1">
        {microLabel("Site")}
        <select
          className={selectClassName()}
          disabled={disabled}
          value={dest.root}
          onChange={(e) => setRoot(e.target.value as T9MediaRoot)}
        >
          {R2_UPLOAD_SITE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[10rem] flex-1">
        {microLabel("Project")}
        <select
          className={selectClassName()}
          disabled={disabled}
          value={dest.segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          {projects.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[9rem] flex-1">
        {microLabel("Folder")}
        <select
          className={selectClassName()}
          disabled={disabled}
          value={dest.quality}
          onChange={(e) => setQuality(e.target.value as R2UploadQuality)}
        >
          {R2_UPLOAD_QUALITY_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <div className={className}>
      {/* Desktop compact bar */}
      <div className="hidden rounded border border-white/10 bg-[#141414] px-3 py-3 md:block">
        {fields}
        <p className="mt-2 text-xs text-white/45">
          {statusLine}
          <span className="ml-2 font-mono text-white/30">{prefixPreview}</span>
        </p>
      </div>

      {/* Mobile: status + open wizard */}
      <div className="rounded border border-white/10 bg-[#141414] px-3 py-3 md:hidden">
        <p className="text-[0.6rem] uppercase tracking-[0.2em] text-white/45">Upload destination</p>
        <p className="mt-1 text-sm text-white/85">{statusLine}</p>
        <button
          type="button"
          disabled={disabled}
          className="btn btn-ghost mt-2 w-full text-xs uppercase tracking-[0.14em]"
          onClick={() => onSheetOpenChange?.(true)}
        >
          Change destination
        </button>
      </div>

      {/* Mobile step sheet */}
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/80 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Upload destination"
        >
          <div className="mt-auto flex max-h-[92dvh] flex-col rounded-t-2xl border border-white/10 bg-[#121212]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/50">
                {step}/3 ·{" "}
                {step === 1 ? "Site" : step === 2 ? "Project" : "Folder"}
              </p>
              <button
                type="button"
                className="text-sm text-white/55 hover:text-white"
                onClick={() => onSheetOpenChange?.(false)}
              >
                Close
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-5">
              {step === 1 ? (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-white/60">Where should this media live?</p>
                  {R2_UPLOAD_SITE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`block w-full rounded border px-4 py-3 text-left text-sm ${
                        dest.root === opt.id
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/10 text-white/70"
                      }`}
                      onClick={() => {
                        setRoot(opt.id);
                        setStep(2);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {step === 2 ? (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-white/60">Project / category</p>
                  {projects.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`block w-full rounded border px-4 py-3 text-left text-sm ${
                        dest.segment === opt.id
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/10 text-white/70"
                      }`}
                      onClick={() => {
                        setSegment(opt.id);
                        setStep(3);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="mt-2 text-xs uppercase tracking-[0.14em] text-white/45"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                </div>
              ) : null}
              {step === 3 ? (
                <div className="space-y-2">
                  <p className="mb-3 text-sm text-white/60">Folder (quality sibling)</p>
                  {R2_UPLOAD_QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`block w-full rounded border px-4 py-3 text-left ${
                        dest.quality === opt.id
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-white/10 text-white/70"
                      }`}
                      onClick={() => setQuality(opt.id)}
                    >
                      <span className="block text-sm">{opt.label}</span>
                      <span className="mt-0.5 block text-xs text-white/40">{opt.hint}</span>
                    </button>
                  ))}
                  <p className="pt-2 text-xs text-white/45">{statusLine}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost flex-1 text-xs uppercase tracking-[0.14em]"
                      onClick={() => setStep(2)}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary flex-1 text-xs uppercase tracking-[0.14em]"
                      onClick={() => {
                        onSheetOpenChange?.(false);
                        onReadyToPick?.();
                      }}
                    >
                      Pick files
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
