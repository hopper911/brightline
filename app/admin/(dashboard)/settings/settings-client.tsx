"use client";

import { useEffect, useState } from "react";

type EnvStatus = Record<string, boolean>;

type MissionControlEmailStatus = {
  provider: string;
  configured: boolean;
  emailAddress?: string;
  displayName?: string;
  missing: string[];
};

type SiteSetting = { key: string; value: string | null; updatedAt: string };
type AutomationRule = {
  id: string;
  name: string;
  triggerEvent: string;
  notes: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
type AutomationRun = {
  id: string;
  workflowName: string;
  status: string;
  triggerType: string | null;
  entityType: string | null;
  entityId: string | null;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export default function SettingsClient({
  env,
  emailStatus,
}: {
  env: EnvStatus;
  emailStatus: MissionControlEmailStatus;
}) {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [autoProjectRule, setAutoProjectRule] = useState<AutomationRule | null>(null);
  const [recentAutoDrafts, setRecentAutoDrafts] = useState<AutomationRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const [ruleName, setRuleName] = useState("");
  const [ruleEvent, setRuleEvent] = useState("");
  const [ruleNotes, setRuleNotes] = useState("");

  async function load() {
    setError(null);
    const [sRes, rRes, autoRes] = await Promise.all([
      fetch("/api/admin/settings/site-settings", { credentials: "include" }),
      fetch("/api/admin/settings/automation-rules", { credentials: "include" }),
      fetch("/api/admin/automation/create-project-from-media", { credentials: "include" }),
    ]);
    const sJson = (await sRes.json()) as { ok?: boolean; settings?: SiteSetting[]; error?: string };
    const rJson = (await rRes.json()) as { ok?: boolean; rules?: AutomationRule[]; error?: string };
    const autoJson = (await autoRes.json()) as {
      ok?: boolean;
      rule?: AutomationRule;
      recentDrafts?: AutomationRun[];
      error?: string;
    };
    if (!sRes.ok) throw new Error(sJson.error ?? "Failed to load settings.");
    if (!rRes.ok) throw new Error(rJson.error ?? "Failed to load rules.");
    if (!autoRes.ok) throw new Error(autoJson.error ?? "Failed to load upload automation.");
    setSettings(sJson.settings ?? []);
    setRules(rJson.rules ?? []);
    setAutoProjectRule(autoJson.rule ?? null);
    setRecentAutoDrafts(autoJson.recentDrafts ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void load().catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function upsertSetting() {
    const key = newKey.trim();
    if (!key) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ key, value: newVal }]),
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; settings?: SiteSetting[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSettings(json.settings ?? []);
      setNewKey("");
      setNewVal("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(id: string, isEnabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/settings/automation-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; rule?: AutomationRule; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAutoProjectRule() {
    if (!autoProjectRule) return;
    await toggleRule(autoProjectRule.id, !autoProjectRule.isEnabled);
  }

  async function createRule() {
    const name = ruleName.trim();
    const triggerEvent = ruleEvent.trim();
    if (!name || !triggerEvent) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/automation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, triggerEvent, notes: ruleNotes || null, isEnabled: true }),
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; rule?: AutomationRule; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setRuleName("");
      setRuleEvent("");
      setRuleNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this automation rule?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/settings/automation-rules/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">Admin</p>
      <h1 className="mt-2 font-display text-4xl text-white">Settings</h1>
      <p className="mt-2 text-sm text-white/70">
        Control plane for site settings and automation rules. Secrets are not shown.
      </p>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
          Mission Control · Business mailbox
        </h2>
        <p className="mt-3 text-sm text-white/65">
          This is the mailbox Mission Control uses on{" "}
          <span className="text-white/85">/studio</span> for inbox sync and send (when SMTP/IMAP is
          configured). Set <span className="font-mono text-xs text-white/55">STUDIO_OS_*</span> or
          Resend in Vercel. See <span className="font-mono text-xs text-white/55">DEPLOY.md</span> in the
          repository root for environment variables.
        </p>

        {emailStatus.configured && emailStatus.emailAddress ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              {emailStatus.provider === "resend" ? (
                <span className="rounded-full border border-violet-400/35 bg-violet-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-violet-200/95">
                  Transactional (Resend)
                </span>
              ) : (
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200/95">
                  Business account
                </span>
              )}
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/75">
                Connected
              </span>
            </div>
            <p className="mt-3 font-mono text-sm text-white/90">
              {emailStatus.displayName
                ? `${emailStatus.displayName} · ${emailStatus.emailAddress}`
                : emailStatus.emailAddress}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Provider: <span className="font-mono text-white/55">{emailStatus.provider}</span>
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-100/95">Mission Control email is not fully configured.</p>
            {emailStatus.missing.length > 0 ? (
              <p className="mt-2 text-xs text-amber-100/75">
                Missing env:{" "}
                <span className="font-mono text-amber-50/90">{emailStatus.missing.join(", ")}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-100/75">
                Set <span className="font-mono">STUDIO_OS_EMAIL_PROVIDER</span> and the related variables
                in your environment.
              </p>
            )}
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">Env health</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            {Object.entries(env).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-white/70">{k}</span>
                <span
                  className={`text-xs uppercase tracking-[0.2em] ${
                    v ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {v ? "set" : "missing"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">Site settings</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="key (e.g. homepage_featured_media_id)"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
            <input
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="value"
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
            />
            <button className="btn btn-primary" disabled={busy} onClick={() => void upsertSetting()}>
              Save
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {settings.length === 0 ? (
              <p className="text-sm text-white/60">No settings yet.</p>
            ) : (
              settings.map((s) => (
                <div
                  key={s.key}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">{s.key}</p>
                  <p className="mt-1 break-all font-mono text-xs text-white/80">
                    {s.value ?? "null"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
              Upload automation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
              Auto-create unpublished project drafts from new R2 uploads. Drafts are never published automatically;
              they stay editable in Studio OS for review, copy, tagging, and curation.
            </p>
          </div>
          <button className="btn btn-primary" disabled={busy || !autoProjectRule} onClick={() => void toggleAutoProjectRule()}>
            {autoProjectRule?.isEnabled ? "Disable auto-create" : "Enable auto-create project from new uploads"}
          </button>
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Recent auto-created drafts</p>
          <div className="mt-3 space-y-2">
            {recentAutoDrafts.length ? (
              recentAutoDrafts.map((run) => (
                <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div>
                    <p className="text-white/80">{run.message ?? "Auto-created draft"}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {run.status} · {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                  {run.entityId ? (
                    <a className="text-xs text-white/50 underline hover:text-white" href={`/admin/work/${run.entityId}`}>
                      Open draft
                    </a>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-white/50">No auto-created drafts yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
              Automation rules
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Lightweight rule registry (enforcement is added by workflows).
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="Rule name"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
          <input
            value={ruleEvent}
            onChange={(e) => setRuleEvent(e.target.value)}
            placeholder="Trigger event (e.g. project.published)"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
          />
          <button className="btn btn-primary" disabled={busy} onClick={() => void createRule()}>
            Create rule
          </button>
        </div>
        <textarea
          value={ruleNotes}
          onChange={(e) => setRuleNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white"
        />

        <div className="mt-6 space-y-2">
          {rules.length === 0 ? (
            <p className="text-sm text-white/60">No rules yet.</p>
          ) : (
            rules.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              >
                <div className="min-w-[240px]">
                  <p className="text-sm text-white/90">{r.name}</p>
                  <p className="mt-1 text-xs text-white/50">{r.triggerEvent}</p>
                  {r.notes ? <p className="mt-2 text-sm text-white/70">{r.notes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-ghost text-sm"
                    disabled={busy}
                    onClick={() => void toggleRule(r.id, !r.isEnabled)}
                  >
                    {r.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className="btn btn-ghost text-sm text-red-300"
                    disabled={busy}
                    onClick={() => void deleteRule(r.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

