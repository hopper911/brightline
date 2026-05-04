"use client";

import type { ChangeEvent } from "react";

type AiEditableFieldProps = {
  label: string;
  description?: string;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  onRewrite?: () => void;
  onUndo?: () => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  loading?: boolean;
  error?: string | null;
  hasUndo?: boolean;
  hasPendingAi?: boolean;
  onAccept?: () => void;
  tonePreset?: string;
  tonePresets?: readonly string[];
  onTonePresetChange?: (value: string) => void;
  aiDraft?: string | null;
  onAcceptDraft?: () => void;
  onDiscardDraft?: () => void;
};

export default function AiEditableField({
  label,
  description,
  value,
  onChange,
  onGenerate,
  onRewrite,
  onUndo,
  placeholder,
  multiline = false,
  rows = 2,
  loading = false,
  error,
  hasUndo = false,
  hasPendingAi = false,
  onAccept,
  tonePreset,
  tonePresets = [],
  onTonePresetChange,
  aiDraft,
  onAcceptDraft,
  onDiscardDraft,
}: AiEditableFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };
  const generateLabel = value.trim() ? "Regenerate" : "AI Generate";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <label className="block text-xs uppercase tracking-wide text-black/60">
            {label}
          </label>
          {description ? (
            <p className="mt-1 text-xs text-black/45">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {tonePresets.length > 0 && tonePreset && onTonePresetChange ? (
            <select
              value={tonePreset}
              onChange={(event) => onTonePresetChange(event.target.value)}
              className="rounded border border-black/15 bg-white px-2 py-1 text-xs text-black/65"
              disabled={loading}
              aria-label={`${label} AI tone preset`}
            >
              {tonePresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </select>
          ) : null}
          {hasPendingAi ? (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={onAccept}
              disabled={loading}
            >
              Accept
            </button>
          ) : null}
          {hasUndo ? (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={onUndo}
              disabled={loading}
            >
              Undo
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={onGenerate}
            disabled={loading}
          >
            {loading ? "Generating…" : generateLabel}
          </button>
          {onRewrite ? (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={onRewrite}
              disabled={loading || !value.trim()}
            >
              Rewrite with tone
            </button>
          ) : null}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={handleChange}
          className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          value={value}
          onChange={handleChange}
          className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm"
          placeholder={placeholder}
        />
      )}
      {aiDraft ? (
        <div className="mt-2 rounded-lg border border-black/10 bg-black/[0.03] p-3">
          <p className="text-xs uppercase tracking-wide text-black/45">AI rewrite draft</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-black/75">{aiDraft}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={onAcceptDraft}
              disabled={loading}
            >
              Accept rewrite
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={onDiscardDraft}
              disabled={loading}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      {hasPendingAi ? (
        <p className="mt-1 text-xs text-emerald-700">
          AI draft inserted. Edit it directly, accept it here, then save the project when ready.
        </p>
      ) : null}
    </div>
  );
}

