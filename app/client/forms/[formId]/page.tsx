"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FormFieldType } from "@prisma/client";

type Field = {
  id: string;
  label: string;
  fieldType: FormFieldType;
  placeholder: string | null;
  required: boolean;
  options: unknown;
};

type Load =
  | { status: "loading" }
  | { status: "err"; message: string }
  | {
      status: "ok";
      title: string;
      description: string | null;
      fields: Field[];
      existing: Record<string, string>;
      formStatus: string;
    };

export default function ClientFormPage() {
  const params = useParams<{ formId: string }>();
  const token = params.formId;
  const [state, setState] = useState<Load>({ status: "loading" });
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const res = await fetch(`/api/client/forms/${encodeURIComponent(token)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        template?: { title: string; description: string | null };
        fields?: Field[];
        existingValues?: Record<string, string>;
        status?: string;
      };
      if (c) return;
      if (!res.ok || !data.ok || !data.fields) {
        setState({ status: "err", message: data.error ?? "Not found." });
        return;
      }
      setState({
        status: "ok",
        title: data.template?.title ?? "Form",
        description: data.template?.description ?? null,
        fields: data.fields,
        existing: data.existingValues ?? {},
        formStatus: data.status ?? "DRAFT",
      });
      setValues(data.existingValues ?? {});
    })();
    return () => {
      c = true;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "ok") return;
    setBusy(true);
    setErr(null);
    const body: Record<string, unknown> = { ...values };
    for (const f of state.fields) {
      if (f.fieldType === "MULTISELECT") {
        const raw = values[f.id] ?? "[]";
        try {
          body[f.id] = JSON.parse(raw || "[]");
        } catch {
          body[f.id] = [];
        }
      }
      if (f.fieldType === "CHECKBOX") {
        body[f.id] = values[f.id] === "true" || values[f.id] === "on" ? "true" : "false";
      }
    }
    const res = await fetch(`/api/client/forms/${encodeURIComponent(token)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setErr(data.error ?? "Submit failed");
      return;
    }
    setState((s) => (s.status === "ok" ? { ...s, formStatus: "SUBMITTED" } : s));
  }

  if (state.status === "loading") {
    return <div className="px-4 py-24 text-center text-white/70">Loading…</div>;
  }
  if (state.status === "err") {
    return <div className="px-4 py-24 text-center text-red-200/90">{state.message}</div>;
  }

  if (state.formStatus === "SUBMITTED") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-white">
        <h1 className="font-display text-2xl">Thank you</h1>
        <p className="mt-4 text-white/70">Your responses have been submitted.</p>
        <Link href="/client" className="mt-8 inline-block text-amber-200/90 hover:text-amber-100">
          Client home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-white">
      <h1 className="font-display text-2xl">{state.title}</h1>
      {state.description && <p className="mt-2 text-sm text-white/70">{state.description}</p>}
      {err && <p className="mt-4 text-sm text-red-300">{err}</p>}
      <form onSubmit={submit} className="mt-8 space-y-4">
        {state.fields.map((f) => (
          <div key={f.id}>
            <label className="block text-sm text-white/80">
              {f.label}
              {f.required && <span className="text-amber-200/90"> *</span>}
            </label>
            {f.fieldType === "TEXTAREA" && (
              <textarea
                required={f.required}
                className="mt-1 w-full rounded border border-white/20 bg-black/50 px-3 py-2 text-sm"
                placeholder={f.placeholder ?? ""}
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
            {(f.fieldType === "TEXT" || f.fieldType === "EMAIL" || f.fieldType === "PHONE") && (
              <input
                required={f.required}
                type={f.fieldType === "EMAIL" ? "email" : "text"}
                className="mt-1 w-full rounded border border-white/20 bg-black/50 px-3 py-2 text-sm"
                placeholder={f.placeholder ?? ""}
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
            {f.fieldType === "NUMBER" && (
              <input
                required={f.required}
                type="text"
                inputMode="decimal"
                className="mt-1 w-full rounded border border-white/20 bg-black/50 px-3 py-2 text-sm"
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
            {f.fieldType === "DATE" && (
              <input
                required={f.required}
                type="date"
                className="mt-1 w-full rounded border border-white/20 bg-black/50 px-3 py-2 text-sm"
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              />
            )}
            {f.fieldType === "CHECKBOX" && (
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values[f.id] === "true"}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.id]: e.target.checked ? "true" : "false" }))
                  }
                />
                <span className="text-white/70">{f.placeholder || "Yes"}</span>
              </label>
            )}
            {f.fieldType === "SELECT" && Array.isArray(f.options) && (
              <select
                required={f.required}
                className="mt-1 w-full rounded border border-white/20 bg-black/50 px-3 py-2 text-sm"
                value={values[f.id] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              >
                <option value="">—</option>
                {(f.options as string[]).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            {f.fieldType === "MULTISELECT" && Array.isArray(f.options) && (
              <div className="mt-1 space-y-1">
                {(f.options as string[]).map((o) => {
                  let selected: string[] = [];
                  try {
                    selected = JSON.parse(values[f.id] || "[]") as string[];
                    if (!Array.isArray(selected)) selected = [];
                  } catch {
                    selected = [];
                  }
                  const on = selected.includes(o);
                  return (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(o);
                          else next.delete(o);
                          setValues((v) => ({ ...v, [f.id]: JSON.stringify([...next]) }));
                        }}
                      />
                      {o}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
