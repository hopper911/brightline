"use client";

import { FormFieldType } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const FIELD_TYPES = Object.values(FormFieldType);

type FieldRow = {
  label: string;
  fieldType: FormFieldType;
  placeholder?: string | null;
  required?: boolean;
  options?: string[] | null;
  mapsToProjectField?: string | null;
};

export function FormTemplateBuilder({
  templateId,
  initialTitle,
  initialDescription,
  initialFieldsJson,
}: {
  templateId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialFieldsJson: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<FieldRow[]>(() => {
    try {
      const p = JSON.parse(initialFieldsJson) as unknown;
      if (!Array.isArray(p)) return [{ label: "Your name", fieldType: FormFieldType.TEXT, required: true }];
      return p as FieldRow[];
    } catch {
      return [{ label: "Your name", fieldType: FormFieldType.TEXT, required: true }];
    }
  });

  async function saveMeta() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/forms/templates/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || null }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) setError(data.error ?? "Save failed");
    else router.refresh();
  }

  async function saveFields() {
    setBusy(true);
    setError(null);
    const fields = rows.map((row, i) => ({
      label: row.label,
      fieldType: row.fieldType,
      placeholder: row.placeholder ?? null,
      required: row.required ?? false,
      options: row.options ?? null,
      sortOrder: i,
      mapsToProjectField: row.mapsToProjectField ?? null,
    }));
    const res = await fetch(`/api/admin/forms/templates/${templateId}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) setError(data.error ?? "Save failed");
    else router.refresh();
  }

  function addRow() {
    setRows((r) => [...r, { label: "New field", fieldType: FormFieldType.TEXT, required: false }]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 text-white">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      )}
      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl">Basics</h2>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Title</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-white/60">Description</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={saveMeta}>
          Save title & description
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl">Fields</h2>
          <button type="button" className="btn border border-white/20 bg-white/5 text-sm" onClick={addRow}>
            Add row
          </button>
        </div>
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2 rounded border border-white/10 p-3">
              <input
                className="min-w-[140px] flex-1 rounded border border-white/15 bg-black/40 px-2 py-1 text-sm"
                value={row.label}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) => prev.map((x, j) => (j === i ? { ...x, label: v } : x)));
                }}
              />
              <select
                className="rounded border border-white/15 bg-black/40 px-2 py-1 text-sm"
                value={row.fieldType}
                onChange={(e) => {
                  const v = e.target.value as FormFieldType;
                  setRows((prev) => prev.map((x, j) => (j === i ? { ...x, fieldType: v } : x)));
                }}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={Boolean(row.required)}
                  onChange={(e) => {
                    setRows((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x))
                    );
                  }}
                />
                Req
              </label>
              <button
                type="button"
                className="text-xs text-red-300 hover:text-red-200"
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn border border-amber-400/40 bg-amber-400/10" disabled={busy} onClick={saveFields}>
          Save fields
        </button>
      </div>

      <p className="text-sm">
        <Link href={`/admin/contracts/forms/assign?templateId=${templateId}`} className="text-amber-200 hover:text-amber-100">
          Assign to client →
        </Link>
      </p>
    </div>
  );
}
