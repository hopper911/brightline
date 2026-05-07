"use client";

import type { EmailProviderStatus } from "@/lib/integrations/emailProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EmailThread = {
  id: string;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  snippet: string | null;
  lastMessageAt: string;
  unread: boolean;
  href?: string | null;
};

type Props = {
  status: EmailProviderStatus;
  account: {
    id: string;
    emailAddress: string;
    displayName: string | null;
    lastSyncedAt: string | null;
  } | null;
  threads: EmailThread[];
  unreadCount: number;
};

function providerLabel(provider: EmailProviderStatus["provider"]) {
  if (provider === "resend") return "Resend (transactional API)";
  if (provider === "smtp_imap") return "SMTP / IMAP";
  return "Not configured";
}

export function MissionControlEmailPanel({
  status,
  account,
  threads,
  unreadCount,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const allowedFrom = status.allowedFromEmails ?? [];
  const defaultFrom = status.defaultFromEmail ?? allowedFrom[0] ?? "";
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const list = status.allowedFromEmails ?? [];
      const d = status.defaultFromEmail ?? list[0] ?? "";
      setFrom((prev) => (list.includes(prev) ? prev : d));
    });
    return () => {
      cancelled = true;
    };
  }, [status.defaultFromEmail, status.allowedFromEmails]);

  async function syncInbox() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/studio/email/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ limit: 50 }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        fetched?: number;
        created?: number;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || "Sync failed");
      setMessage(`Synced ${data.fetched ?? 0} messages (${data.created ?? 0} new).`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    setBusy(true);
    setMessage(null);
    setDraftId(null);
    try {
      const res = await fetch("/api/studio/email/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fromEmail: from, to, subject, text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        draft?: { id: string };
      };
      if (!res.ok || !data.ok || !data.draft) {
        throw new Error(data.error || "Draft failed");
      }
      setDraftId(data.draft.id);
      setMessage("Draft saved. Review before sending.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Draft failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendDraft() {
    if (!draftId) return;
    const ok = window.confirm("Send this email now?");
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/studio/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ draftId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Send failed");
      setMessage("Email sent.");
      setDraftId(null);
      setTo("");
      setSubject("");
      setText("");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  const inboxDisplay = status.inboxEmail?.trim() || null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-xs text-white/70">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">
          Email status
        </p>
        <dl className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <dt className="shrink-0 text-white/45">Provider</dt>
            <dd className="font-mono text-white/85">{providerLabel(status.provider)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <dt className="shrink-0 text-white/45">Inbox</dt>
            <dd className="break-all font-mono text-white/85">
              {inboxDisplay ?? "Set STUDIO_OS_INBOX_EMAIL or STUDIO_OS_IMAP_USER"}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
            <dt className="shrink-0 text-white/45">Default From</dt>
            <dd className="break-all font-mono text-white/85">
              {status.defaultFromEmail ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/45">Allowed From</dt>
            <dd className="mt-1">
              <ul className="space-y-0.5 font-mono text-[11px] text-white/80">
                {(status.allowedFromEmails ?? []).map((addr) => (
                  <li key={addr}>{addr}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div>
              <span className="text-white/45">SMTP</span>
              {status.provider === "resend" ? (
                <span className="ml-2 text-white/55">(Resend API)</span>
              ) : null}
              <span className="ml-2 text-white/85">
                {status.smtpConfigured ? "Configured" : "Not configured"}
              </span>
            </div>
            <div>
              <span className="text-white/45">IMAP</span>
              <span className="ml-2 text-white/85">
                {status.imapConfigured ? "Configured" : "Not configured"}
              </span>
            </div>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            {status.configured ? (
              <>
                {status.provider === "resend" ? (
                  <span className="rounded-full border border-violet-400/35 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200/95">
                    Transactional (Resend)
                  </span>
                ) : (
                  <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200/95">
                    Business account
                  </span>
                )}
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                  Connected
                </span>
                <span>
                  {status.emailAddress ?? account?.emailAddress ?? "mailbox"}
                </span>
              </>
            ) : (
              "Email is not configured yet."
            )}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {account?.lastSyncedAt
              ? `Last sync: ${new Date(account.lastSyncedAt).toLocaleString()}`
              : status.configured
                ? "Ready to sync."
                : `Missing: ${status.missing.join(", ") || "email provider"}`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          disabled={busy || !status.configured}
          onClick={() => void syncInbox()}
        >
          {busy ? "Working..." : "Sync inbox"}
        </button>
      </div>

      {message ? <p className="text-xs text-white/60">{message}</p> : null}

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
          Recent email {unreadCount > 0 ? `- ${unreadCount} unread` : ""}
        </p>
        <div className="mt-3 space-y-2">
          {threads.length === 0 ? (
            <p className="text-sm text-white/50">No synced client emails yet.</p>
          ) : (
            threads.map((thread) => {
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white">
                      {thread.unread ? "Unread: " : ""}
                      {thread.subject}
                    </p>
                    <p className="shrink-0 text-xs text-white/40">
                      {new Date(thread.lastMessageAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {thread.fromName || thread.fromEmail || "Unknown sender"}
                  </p>
                  {thread.snippet ? (
                    <p className="mt-1 line-clamp-2 text-xs text-white/45">
                      {thread.snippet}
                    </p>
                  ) : null}
                </>
              );
              return thread.href ? (
                <a
                  key={thread.id}
                  href={thread.href}
                  className="block rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={thread.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">
          Quick draft
        </p>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              From
            </span>
            <select
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              value={from}
              disabled={!status.configured || allowedFrom.length === 0}
              onChange={(event) => setFrom(event.target.value)}
            >
              {allowedFrom.map((addr) => (
                <option key={addr} value={addr}>
                  {addr}
                </option>
              ))}
            </select>
          </label>
          <input
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="To"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <input
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <textarea
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            placeholder="Message"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy || !status.configured}
              onClick={() => void saveDraft()}
            >
              Save draft
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs"
              disabled={busy || !draftId}
              onClick={() => void sendDraft()}
            >
              Send saved draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
