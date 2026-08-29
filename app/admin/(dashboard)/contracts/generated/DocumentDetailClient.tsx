"use client";

import { GeneratedDocumentStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sanitizeHtmlForClientPreview } from "@/lib/contracts/sanitize-html";

type Doc = {
  id: string;
  title: string;
  status: GeneratedDocumentStatus;
  contentHtml: string;
  clientToken: string;
  sentAt: Date | null;
};

const STATUS_OPTIONS = [
  GeneratedDocumentStatus.DRAFT,
  GeneratedDocumentStatus.GENERATED,
  GeneratedDocumentStatus.SENT,
  GeneratedDocumentStatus.VIEWED,
  GeneratedDocumentStatus.SIGNED,
  GeneratedDocumentStatus.DECLINED,
  GeneratedDocumentStatus.EXPIRED,
  GeneratedDocumentStatus.ARCHIVED,
] as const;

const STATUS_LABEL: Record<GeneratedDocumentStatus, string> = {
  [GeneratedDocumentStatus.DRAFT]: "Draft",
  [GeneratedDocumentStatus.GENERATED]: "Generated",
  [GeneratedDocumentStatus.SENT]: "Sent",
  [GeneratedDocumentStatus.VIEWED]: "Viewed",
  [GeneratedDocumentStatus.SIGNED]: "Signed",
  [GeneratedDocumentStatus.DECLINED]: "Declined",
  [GeneratedDocumentStatus.EXPIRED]: "Expired",
  [GeneratedDocumentStatus.ARCHIVED]: "Archived",
};

function statusBadgeClass(s: GeneratedDocumentStatus): string {
  const base = "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider";
  switch (s) {
    case GeneratedDocumentStatus.SIGNED:
      return `${base} border-emerald-400/25 text-emerald-100/90`;
    case GeneratedDocumentStatus.SENT:
    case GeneratedDocumentStatus.VIEWED:
      return `${base} border-amber-400/25 text-amber-100/85`;
    case GeneratedDocumentStatus.DECLINED:
    case GeneratedDocumentStatus.EXPIRED:
      return `${base} border-red-400/25 text-red-100/85`;
    default:
      return `${base} border-white/15 text-white/70`;
  }
}

function parseFilenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim().replace(/^"+|"+$/g, "");
  return fallback;
}

export function DocumentDetailClient({ document: initial }: { document: Doc }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [contentHtml, setContentHtml] = useState(initial.contentHtml);
  const [status, setStatus] = useState(initial.status);
  const [bodyTab, setBodyTab] = useState<"preview" | "source">("preview");
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const clientUrl =
    typeof window !== "undefined" ? `${window.location.origin}/client/documents/${initial.clientToken}` : "";

  const previewHtml = useMemo(() => sanitizeHtmlForClientPreview(contentHtml), [contentHtml]);

  async function copyClientLink() {
    if (!clientUrl) return;
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/contracts/documents/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, contentHtml, status }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    router.refresh();
  }

  async function sendToClient() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/contracts/documents/${initial.id}/send`, { method: "POST" });
    const data = (await res.json()) as { ok?: boolean; error?: string; document?: { status: string } };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Send failed");
      return;
    }
    if (data.document?.status) setStatus(data.document.status as GeneratedDocumentStatus);
    router.refresh();
  }

  async function downloadPdf() {
    setPdfBusy(true);
    setError(null);
    const fallbackName = `brightline-document-${initial.id.slice(0, 8)}.pdf`;
    try {
      const res = await fetch(`/api/admin/contracts/documents/${initial.id}/pdf`, { credentials: "include" });
      if (!res.ok) {
        let msg = `PDF could not be loaded (${res.status}).`;
        try {
          const j = (await res.json()) as { error?: string };
          if (typeof j.error === "string" && j.error) msg = j.error;
        } catch {
          /* not JSON */
        }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      if (!blob.size) {
        setError("PDF was empty. Try again or check server logs.");
        return;
      }
      const filename = parseFilenameFromDisposition(res.headers.get("content-disposition"), fallbackName);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Could not download PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-8 text-white">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      )}

      <div className="space-y-5 rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">Status</span>
            <span className={statusBadgeClass(status)}>{STATUS_LABEL[status]}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary text-xs sm:text-sm" disabled={busy || pdfBusy} onClick={save}>
              Save changes
            </button>
            <button
              type="button"
              className="btn border border-white/20 bg-white/5 text-xs sm:text-sm hover:bg-white/10 disabled:opacity-40"
              disabled={busy || pdfBusy || status === "SIGNED"}
              onClick={sendToClient}
            >
              Mark sent to client
            </button>
            <button
              type="button"
              className="btn border border-white/20 bg-white/5 text-xs sm:text-sm hover:bg-white/10 disabled:opacity-40"
              disabled={busy || pdfBusy}
              onClick={downloadPdf}
            >
              {pdfBusy ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>

        {clientUrl ? (
          <div className="border-t border-white/10 pt-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-white/45">Client link</span>
              <button
                type="button"
                className="shrink-0 text-xs uppercase tracking-wider text-amber-200/90 hover:text-amber-100 disabled:opacity-40"
                onClick={copyClientLink}
                disabled={!clientUrl}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-xs leading-relaxed text-white/75">
              <Link href={`/client/documents/${initial.clientToken}`} className="text-amber-200/90 hover:text-amber-100">
                {clientUrl}
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">Title</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none ring-white/20 focus:border-white/25 focus:ring-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">Workflow status</span>
          <select
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none ring-white/20 focus:border-white/25 focus:ring-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as GeneratedDocumentStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
              bodyTab === "preview" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            }`}
            onClick={() => setBodyTab("preview")}
          >
            Preview
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
              bodyTab === "source" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
            }`}
            onClick={() => setBodyTab("source")}
          >
            Source HTML
          </button>
        </div>

        {bodyTab === "preview" ? (
          <div
            className="min-h-[360px] rounded-lg border border-white/15 bg-black/30 px-4 py-5 text-sm leading-relaxed text-white/90 [&_a]:text-amber-200/90 [&_p]:mb-3 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: previewHtml || "<p class=\"text-white/40\">No content.</p>" }}
          />
        ) : (
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-white/45">HTML body</span>
            <textarea
              className="min-h-[360px] w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 font-mono text-xs leading-relaxed outline-none ring-white/20 focus:border-white/25 focus:ring-1"
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
            />
          </label>
        )}
      </div>
    </div>
  );
}
