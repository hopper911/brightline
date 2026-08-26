"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ClientOpt = { id: string; companyName: string };
type ProjectOpt = { id: string; title: string };
type TemplateOpt = { id: string; title: string; type: string };
type InvoiceOpt = { id: string; invoiceNumber: number };

export function GeneratorForm({
  clients,
  templates,
  initialClientId,
  initialProjectId,
  initialInvoiceId,
  initialTemplateId,
}: {
  clients: ClientOpt[];
  templates: TemplateOpt[];
  initialClientId?: string;
  initialProjectId?: string;
  initialInvoiceId?: string;
  initialTemplateId?: string;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(initialTemplateId ?? templates[0]?.id ?? "");
  const [studioClientId, setStudioClientId] = useState(initialClientId ?? clients[0]?.id ?? "");
  const [studioProjectId, setStudioProjectId] = useState(initialProjectId ?? "");
  const [studioInvoiceId, setStudioInvoiceId] = useState(initialInvoiceId ?? "");
  const [title, setTitle] = useState("");
  const [asDraft, setAsDraft] = useState(false);
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [invoices, setInvoices] = useState<InvoiceOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects(clientId: string) {
    if (!clientId) {
      setProjects([]);
      return;
    }
    const res = await fetch(`/api/admin/contracts/lookup/projects?clientId=${encodeURIComponent(clientId)}`);
    const data = (await res.json()) as { ok?: boolean; projects?: ProjectOpt[] };
    setProjects(data.projects ?? []);
  }

  async function loadInvoices(clientId: string) {
    if (!clientId) {
      setInvoices([]);
      return;
    }
    const res = await fetch(`/api/admin/contracts/lookup/invoices?clientId=${encodeURIComponent(clientId)}`);
    const data = (await res.json()) as { ok?: boolean; invoices?: InvoiceOpt[] };
    setInvoices(data.invoices ?? []);
  }

  async function onClientChange(id: string) {
    setStudioClientId(id);
    setStudioProjectId("");
    setStudioInvoiceId("");
    await loadProjects(id);
    await loadInvoices(id);
  }

  useEffect(() => {
    if (!initialClientId) return;
    void loadProjects(initialClientId);
    void loadInvoices(initialClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once for prefilled client
  }, [initialClientId]);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/contracts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        studioClientId,
        studioProjectId: studioProjectId || null,
        studioInvoiceId: studioInvoiceId || null,
        title: title.trim() || null,
        asDraft,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; document?: { id: string } };
    setBusy(false);
    if (!res.ok || !data.ok || !data.document?.id) {
      setError(data.error ?? "Failed.");
      return;
    }
    router.push(`/admin/contracts/generated/${data.document.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 text-white">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      )}
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Template</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} ({t.type})
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Client</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={studioClientId}
          onChange={(e) => void onClientChange(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Project (optional)</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={studioProjectId}
          onChange={(e) => setStudioProjectId(e.target.value)}
        >
          <option value="">—</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Invoice (optional)</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={studioInvoiceId}
          onChange={(e) => setStudioInvoiceId(e.target.value)}
        >
          <option value="">—</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              #{i.invoiceNumber}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Custom title (optional)</span>
        <input
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} />
        Create as DRAFT (prepare before sending)
      </label>
      <button type="button" className="btn btn-primary" disabled={busy || !templateId || !studioClientId} onClick={submit}>
        Generate document
      </button>
    </div>
  );
}
