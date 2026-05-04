"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Template = {
  id: string;
  slug: string;
  name: string;
  type: string;
  defaultPrice: string;
  maxPrice: string | null;
  unitLabel: string;
};

export type ProjectOpt = {
  id: string;
  title: string;
  client: string;
  clientId: string | null;
};

type Props = {
  templates: Template[];
  projects: ProjectOpt[];
};

async function readJson(res: Response) {
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.error ?? "Request failed.");
  }
  return data;
}

export function InvoiceQuickPanel({ templates, projects }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs =
    "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35";

  const withClient = projects.filter((p) => p.clientId);

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const fd = new FormData(form);
    const projectId = fd.get("projectId")?.toString();
    if (!projectId) {
      setError("Choose a project.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/studio/invoices/generate-from-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      const data = (await readJson(res)) as { invoice?: { id: string } };
      try {
        form.reset();
      } catch {
        /* ignore if detached */
      }
      router.refresh();
      if (data.invoice?.id) router.push(`/studio/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createDraft(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const fd = new FormData(form);
    const projectId = fd.get("projectId")?.toString();
    if (!projectId) {
      setError("Choose a project.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/studio/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });
      const data = (await readJson(res)) as { invoice?: { id: string } };
      try {
        form.reset();
      } catch {
        /* ignore if detached */
      }
      router.refresh();
      if (data.invoice?.id) router.push(`/studio/invoices/${data.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={(ev) => void generate(ev)} className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-lg text-white">Generate from project</h2>
        <p className="mt-1 text-xs text-white/50">
          Line items from templates: retouch count, travel, cancellation, creative fee when shot.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Project</span>
            <select name="projectId" required className={`${inputs} mt-1`} disabled={withClient.length === 0}>
              <option value="">Select…</option>
              {withClient.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client} — {p.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary w-full" disabled={busy || withClient.length === 0}>
            {busy ? "Working…" : "Generate draft"}
          </button>
          {withClient.length === 0 ? (
            <p className="text-xs text-amber-200/80">Link a Studio client on the project to enable invoicing.</p>
          ) : null}
        </div>
      </form>

      <form onSubmit={(ev) => void createDraft(ev)} className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-lg text-white">Blank draft</h2>
        <p className="mt-1 text-xs text-white/50">Empty invoice; add lines from templates on the next screen.</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Project</span>
            <select name="projectId" required className={`${inputs} mt-1`} disabled={withClient.length === 0}>
              <option value="">Select…</option>
              {withClient.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client} — {p.title}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-ghost w-full border border-white/15" disabled={busy || withClient.length === 0}>
            {busy ? "Working…" : "Create draft"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="lg:col-span-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h3 className="text-xs uppercase tracking-[0.25em] text-white/50">Service templates</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/85">
              <span className="font-medium text-white">{t.name}</span>
              <span className="ml-2 text-white/45">{t.type}</span>
              <p className="text-xs text-white/50">
                {Number(t.defaultPrice).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                {t.maxPrice
                  ? ` – ${Number(t.maxPrice).toLocaleString("en-US", { style: "currency", currency: "USD" })} max`
                  : ""}
                /{t.unitLabel}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
