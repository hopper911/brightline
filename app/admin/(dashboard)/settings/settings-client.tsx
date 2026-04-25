"use client";

import { useEffect, useState } from "react";

type EnvStatus = Record<string, boolean>;

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

export default function SettingsClient({ env }: { env: EnvStatus }) {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const [ruleName, setRuleName] = useState("");
  const [ruleEvent, setRuleEvent] = useState("");
  const [ruleNotes, setRuleNotes] = useState("");

  async function load() {
    setError(null);
    const [sRes, rRes] = await Promise.all([
      fetch("/api/admin/settings/site-settings", { credentials: "include" }),
      fetch("/api/admin/settings/automation-rules", { credentials: "include" }),
    ]);
    const sJson = (await sRes.json()) as { ok?: boolean; settings?: SiteSetting[]; error?: string };
    const rJson = (await rRes.json()) as { ok?: boolean; rules?: AutomationRule[]; error?: string };
    if (!sRes.ok) throw new Error(sJson.error ?? "Failed to load settings.");
    if (!rRes.ok) throw new Error(rJson.error ?? "Failed to load rules.");
    setSettings(sJson.settings ?? []);
    setRules(rJson.rules ?? []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
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

