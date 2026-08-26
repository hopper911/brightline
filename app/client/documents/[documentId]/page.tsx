"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sanitizeHtmlForClientPreview } from "@/lib/contracts/render";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      title: string;
      html: string;
      docStatus: string;
      signed: boolean;
    };

export default function ClientDocumentTokenPage() {
  const params = useParams<{ documentId: string }>();
  const token = params.documentId;
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const viewRes = await fetch(`/api/client/documents/${encodeURIComponent(token)}/view`, {
        method: "POST",
      });
      if (cancelled) return;
      if (!viewRes.ok) {
        const j = (await viewRes.json().catch(() => ({}))) as { error?: string };
        setState({ status: "error", message: j.error ?? "Could not open document." });
        return;
      }
      const metaRes = await fetch(`/api/client/documents/${encodeURIComponent(token)}/meta`);
      const meta = (await metaRes.json()) as {
        ok?: boolean;
        error?: string;
        title?: string;
        contentHtml?: string;
        status?: string;
        hasSignature?: boolean;
      };
      if (cancelled) return;
      if (!metaRes.ok || !meta.ok) {
        setState({ status: "error", message: meta.error ?? "Not found." });
        return;
      }
      setState({
        status: "ready",
        title: meta.title ?? "",
        html: meta.contentHtml ?? "",
        docStatus: meta.status ?? "",
        signed: Boolean(meta.hasSignature),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    const res = await fetch(`/api/client/documents/${encodeURIComponent(token)}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName: name,
        signerEmail: email,
        consentAccepted: consent,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setFormError(data.error ?? "Could not sign.");
      return;
    }
    router.refresh();
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, signed: true, docStatus: "SIGNED" }
        : prev
    );
  }

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-white/70">
        Loading document…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center text-red-200/90">
        {state.message}
      </div>
    );
  }

  const safeHtml = sanitizeHtmlForClientPreview(state.html);
  const canSign = !state.signed && (state.docStatus === "SENT" || state.docStatus === "VIEWED");

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Document</p>
      <h1 className="mt-3 font-display text-3xl">{state.title}</h1>
      <div
        className="prose prose-invert prose-sm mt-8 max-w-none border-t border-white/10 pt-8"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      {state.signed && (
        <div className="mt-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-50">
          <p className="font-medium">Signed — thank you.</p>
          <a
            className="mt-2 inline-block text-amber-200 underline"
            href={`/api/client/documents/${encodeURIComponent(token)}/pdf`}
          >
            Download signed PDF
          </a>
        </div>
      )}

      {canSign && (
        <form onSubmit={onSign} className="mt-10 space-y-4 rounded-xl border border-white/15 bg-white/5 p-6">
          <p className="text-sm text-white/80">
            Type your name and email to acknowledge and accept this document electronically.
          </p>
          {formError && <p className="text-sm text-red-300">{formError}</p>}
          <label className="block space-y-1 text-sm">
            <span className="text-white/60">Full name</span>
            <input
              required
              className="w-full rounded border border-white/20 bg-black/50 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-white/60">Email</span>
            <input
              required
              type="email"
              className="w-full rounded border border-white/20 bg-black/50 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-white/80">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree that typing my name constitutes my electronic signature and that I accept this document.</span>
          </label>
          <button type="submit" disabled={busy || !consent} className="btn btn-primary">
            {busy ? "Submitting…" : "Sign document"}
          </button>
        </form>
      )}

      <p className="mt-12 text-xs text-white/40">
        <Link href="/client/documents" className="text-amber-100/80 hover:text-amber-50">
          All documents
        </Link>
      </p>
    </div>
  );
}
