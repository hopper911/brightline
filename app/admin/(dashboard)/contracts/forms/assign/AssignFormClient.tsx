"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type ClientOpt = { id: string; companyName: string };
type ProjectOpt = { id: string; title: string };

export default function AssignFormClient({ clients }: { clients: ClientOpt[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const preTemplateId = sp.get("templateId") ?? "";

  const [formTemplateId, setFormTemplateId] = useState(preTemplateId);
  const [studioClientId, setStudioClientId] = useState(clients[0]?.id ?? "");
  const [studioProjectId, setStudioProjectId] = useState("");
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  async function loadProjects(clientId: string) {
    if (!clientId) {
      setProjects([]);
      return;
    }
    const res = await fetch(`/api/admin/contracts/lookup/projects?clientId=${encodeURIComponent(clientId)}`);
    const data = (await res.json()) as { projects?: ProjectOpt[] };
    setProjects(data.projects ?? []);
  }

  useEffect(() => {
    if (!studioClientId) return;
    void loadProjects(studioClientId);
  }, [studioClientId]);

  async function assign() {
    setBusy(true);
    setError(null);
    setLink(null);
    const res = await fetch("/api/admin/forms/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formTemplateId,
        studioClientId,
        studioProjectId: studioProjectId || null,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; submission?: { clientToken: string } };
    setBusy(false);
    if (!res.ok || !data.ok || !data.submission?.clientToken) {
      setError(data.error ?? "Failed");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setLink(`${origin}/client/forms/${data.submission.clientToken}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-white">
      <p className="text-xs uppercase tracking-[0.35em] text-white/50">
        <Link href="/admin/contracts/forms" className="hover:text-white">
          Forms
        </Link>{" "}
        / Assign
      </p>
      <h1 className="font-display text-3xl">Assign form</h1>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <label className="block space-y-1 text-sm">
        <span className="text-white/60">Form template ID</span>
        <input
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
          value={formTemplateId}
          onChange={(e) => setFormTemplateId(e.target.value)}
          placeholder="Paste template id from edit URL"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-white/60">Client</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={studioClientId}
          onChange={(e) => setStudioClientId(e.target.value)}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.companyName}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
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
      <button
        type="button"
        className="btn btn-primary"
        disabled={busy || !formTemplateId || !studioClientId}
        onClick={assign}
      >
        Create client link
      </button>
      {link && (
        <p className="break-all text-sm text-emerald-200/90">
          Share: <a href={link}>{link}</a>
        </p>
      )}
    </div>
  );
}
