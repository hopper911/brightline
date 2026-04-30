"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type LineItem = {
  id: string;
  name: string;
  type: string;
  unitLabel: string;
  unitPrice: string;
  quantity: string;
  amount: string;
  sortOrder: number;
  serviceTemplateId: string | null;
  mediaLinks: { id: string; studioMediaId: string | null; galleryImageId: string | null }[];
};

type Template = {
  id: string;
  name: string;
  type: string;
  unitLabel: string;
  defaultPrice: string;
  maxPrice: string | null;
};

type InvoiceShape = {
  id: string;
  invoiceNumber: number;
  status: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  amountPaid: string;
  balanceRemaining: string;
  notes: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  sentAt: string | null;
  lineItems: LineItem[];
  client: { companyName: string };
  project: { id: string; title: string } | null;
};

function dec(v: unknown): string {
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (v && typeof (v as { toString(): string }).toString === "function") {
    return (v as { toString(): string }).toString();
  }
  return "0";
}

function iso(v: string | Date | null | undefined): string | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapLine(li: {
  id: string;
  name: string;
  type: string;
  unitLabel: string;
  unitPrice: unknown;
  quantity: unknown;
  amount: unknown;
  sortOrder: number;
  serviceTemplateId: string | null;
  mediaLinks: LineItem["mediaLinks"];
}): LineItem {
  return {
    id: li.id,
    name: li.name,
    type: li.type,
    unitLabel: li.unitLabel,
    unitPrice: dec(li.unitPrice),
    quantity: dec(li.quantity),
    amount: dec(li.amount),
    sortOrder: li.sortOrder,
    serviceTemplateId: li.serviceTemplateId,
    mediaLinks: li.mediaLinks ?? [],
  };
}

function normalizeInvoice(inv: {
  id: string;
  invoiceNumber: number;
  status: string;
  subtotal: unknown;
  tax: unknown;
  discount: unknown;
  total: unknown;
  amountPaid: unknown;
  balanceRemaining: unknown;
  notes: string | null;
  issuedAt?: string | Date | null;
  dueAt?: string | Date | null;
  sentAt?: string | Date | null;
  lineItems: Parameters<typeof mapLine>[0][];
  client: { companyName: string };
  project: { id: string; title: string } | null;
}): InvoiceShape {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    subtotal: dec(inv.subtotal),
    tax: dec(inv.tax),
    discount: dec(inv.discount),
    total: dec(inv.total),
    amountPaid: dec(inv.amountPaid),
    balanceRemaining: dec(inv.balanceRemaining),
    notes: inv.notes,
    issuedAt: iso(inv.issuedAt),
    dueAt: iso(inv.dueAt),
    sentAt: iso(inv.sentAt),
    lineItems: inv.lineItems.map(mapLine),
    client: inv.client,
    project: inv.project,
  };
}

function money(n: string) {
  return Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

async function readJson(res: Response) {
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) throw new Error(data.error ?? "Request failed.");
  return data;
}

export function InvoiceDetailEditor({
  initialInvoice,
  templates,
}: {
  initialInvoice: InvoiceShape;
  templates: Template[];
}) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const inputs =
    "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35";

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  async function patchInvoice(body: Record<string, unknown>) {
    const res = await fetch(`/api/studio/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = (await readJson(res)) as { invoice: Parameters<typeof normalizeInvoice>[0] };
    setInvoice(normalizeInvoice(data.invoice));
  }

  async function onMetaSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    try {
      await patchInvoice({
        status: fd.get("status")?.toString() || undefined,
        tax: fd.get("tax")?.toString() || undefined,
        discount: fd.get("discount")?.toString() || undefined,
        notes: fd.get("notes")?.toString() || null,
        issuedAt: fd.get("issuedAt")?.toString() || null,
        dueAt: fd.get("dueAt")?.toString() || null,
        sentAt: fd.get("sentAt")?.toString() || null,
      });
      setMsg("Saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addFromTemplate(templateId: string) {
    if (!templateId) return;
    const t = templateById.get(templateId);
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/invoices/${invoice.id}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: [
            {
              serviceTemplateId: t.id,
              name: t.name,
              type: t.type,
              unitLabel: t.unitLabel,
              unitPrice: t.defaultPrice,
              quantity: t.type === "PER_IMAGE" ? 1 : 1,
            },
          ],
        }),
      });
      const data = (await readJson(res)) as { invoice: Parameters<typeof normalizeInvoice>[0] };
      setInvoice(normalizeInvoice(data.invoice));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function updateLine(line: LineItem, form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/invoices/${invoice.id}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: [
            {
              id: line.id,
              name: fd.get("name")?.toString() ?? line.name,
              type: fd.get("type")?.toString() ?? line.type,
              unitLabel: fd.get("unitLabel")?.toString() ?? line.unitLabel,
              unitPrice: fd.get("unitPrice")?.toString(),
              quantity: fd.get("quantity")?.toString(),
              sortOrder: Number(fd.get("sortOrder") ?? line.sortOrder),
            },
          ],
        }),
      });
      const data = (await readJson(res)) as { invoice: Parameters<typeof normalizeInvoice>[0] };
      setInvoice(normalizeInvoice(data.invoice));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLine(lineId: string) {
    if (!confirm("Remove this line?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/invoices/${invoice.id}/line-items/${lineId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await readJson(res)) as { invoice: Parameters<typeof normalizeInvoice>[0] };
      setInvoice(normalizeInvoice(data.invoice));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function attachMedia(lineId: string, form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/invoices/${invoice.id}/line-items/${lineId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studioMediaId: fd.get("studioMediaId")?.toString() || null,
          galleryImageId: fd.get("galleryImageId")?.toString() || null,
        }),
      });
      await readJson(res);
      const fresh = await fetch(`/api/studio/invoices/${invoice.id}`, { credentials: "include" });
      const invData = (await readJson(fresh)) as { invoice: Parameters<typeof normalizeInvoice>[0] };
      setInvoice(normalizeInvoice(invData.invoice));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-white/45">Invoice</p>
        <p className="mt-2 font-display text-3xl text-white">
          #{String(invoice.invoiceNumber).padStart(3, "0")}
        </p>
        <p className="mt-1 text-sm text-white/55">
          {invoice.client.companyName}
          {invoice.project ? ` · ${invoice.project.title}` : ""}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-white/45">Total</dt>
            <dd className="text-lg text-white">{money(invoice.total)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-white/45">Paid</dt>
            <dd className="text-lg text-white">{money(invoice.amountPaid)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-white/45">Balance</dt>
            <dd className="text-lg text-white">{money(invoice.balanceRemaining)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.15em] text-white/45">Status</dt>
            <dd className="text-lg text-white/90">{invoice.status}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={onMetaSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="font-display text-xl text-white">Terms</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Status</span>
            <select name="status" defaultValue={invoice.status} className={`${inputs} mt-1`}>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PARTIALLY_PAID">Partially paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="VOID">Void</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Tax</span>
            <input name="tax" type="number" step="0.01" min="0" defaultValue={invoice.tax} className={`${inputs} mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Discount</span>
            <input name="discount" type="number" step="0.01" min="0" defaultValue={invoice.discount} className={`${inputs} mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Issued</span>
            <input name="issuedAt" type="date" defaultValue={invoice.issuedAt?.slice(0, 10) ?? ""} className={`${inputs} mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Due</span>
            <input name="dueAt" type="date" defaultValue={invoice.dueAt?.slice(0, 10) ?? ""} className={`${inputs} mt-1`} />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-white/50">Sent</span>
            <input name="sentAt" type="date" defaultValue={invoice.sentAt?.slice(0, 10) ?? ""} className={`${inputs} mt-1`} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/50">Notes</span>
          <textarea name="notes" rows={2} defaultValue={invoice.notes ?? ""} className={`${inputs} mt-1`} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Update terms"}
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl text-white">Line items</h2>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Add template</span>
            <select
              className={inputs}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                e.target.value = "";
                void addFromTemplate(v);
              }}
            >
              <option value="">Choose…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-6">
          {invoice.lineItems.length === 0 ? (
            <p className="text-sm text-white/50">No lines yet — add a template or generate from a project.</p>
          ) : (
            invoice.lineItems.map((line) => (
              <div key={line.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <form
                  className="grid gap-3 lg:grid-cols-12"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void updateLine(line, e.currentTarget);
                  }}
                >
                  <input name="name" defaultValue={line.name} className={`${inputs} lg:col-span-4`} />
                  <select name="type" defaultValue={line.type} className={`${inputs} lg:col-span-2`}>
                    <option value="PER_IMAGE">PER_IMAGE</option>
                    <option value="FLAT">FLAT</option>
                    <option value="HOURLY">HOURLY</option>
                    <option value="CANCELLATION">CANCELLATION</option>
                  </select>
                  <input name="unitLabel" defaultValue={line.unitLabel} className={`${inputs} lg:col-span-2`} />
                  <input name="unitPrice" type="number" step="0.01" min="0" defaultValue={line.unitPrice} className={`${inputs} lg:col-span-2`} />
                  <input name="quantity" type="number" step="0.01" min="0.01" defaultValue={line.quantity} className={`${inputs} lg:col-span-1`} />
                  <input name="sortOrder" type="number" defaultValue={line.sortOrder} className={`${inputs} lg:col-span-1`} />
                  <div className="lg:col-span-12 flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-ghost text-xs" disabled={busy}>
                      Recalculate line
                    </button>
                    <button type="button" className="btn btn-ghost text-xs text-red-300" onClick={() => void deleteLine(line.id)}>
                      Remove
                    </button>
                    <span className="ml-auto text-sm text-white/55">Amount {money(line.amount)}</span>
                  </div>
                </form>

                {line.type === "PER_IMAGE" ? (
                  <div className="border-t border-white/10 pt-3 space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                      Billed media ({line.mediaLinks.length})
                    </p>
                    <ul className="text-xs text-white/55 space-y-1">
                      {line.mediaLinks.map((m) => (
                        <li key={m.id}>
                          {m.studioMediaId ? `StudioMedia ${m.studioMediaId.slice(0, 8)}…` : null}
                          {m.galleryImageId ? `GalleryImage ${m.galleryImageId.slice(0, 8)}…` : null}
                        </li>
                      ))}
                    </ul>
                    <form
                      className="flex flex-wrap gap-2 items-end"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void attachMedia(line.id, e.currentTarget);
                      }}
                    >
                      <label className="flex-1 min-w-[140px]">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">studioMediaId</span>
                        <input name="studioMediaId" placeholder="cuid…" className={`${inputs} mt-0.5`} />
                      </label>
                      <label className="flex-1 min-w-[140px]">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-white/40">galleryImageId</span>
                        <input name="galleryImageId" placeholder="cuid…" className={`${inputs} mt-0.5`} />
                      </label>
                      <button type="submit" className="btn btn-primary text-xs" disabled={busy}>
                        Link
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {msg ? <p className="text-sm text-emerald-200">{msg}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
