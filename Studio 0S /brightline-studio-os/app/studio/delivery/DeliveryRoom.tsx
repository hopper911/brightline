"use client";

import { useState, useEffect } from "react";
import {
  getProjectsList,
  getProjectDetail,
  updateProjectStatus,
  updateProjectDeliveryNotes,
  getProjectDrafts,
  generateDeliveryChecklistAction,
  generateDeliveryEmailAction,
  summarizeAssetsAction,
  generateFollowupAction,
} from "./actions";
import { Panel } from "@/components/studio/Panel";
import { EmptyState } from "@/components/studio/EmptyState";

type Project = {
  id: string;
  name: string;
  client: string | null;
  status: string | null;
  notes: string | null;
  deliverables: string | null;
};

export function DeliveryRoom() {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [drafts, setDrafts] = useState<{ type: string; content: string; createdAt: string }[]>([]);
  const [checklist, setChecklist] = useState<string[] | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [assetsSummary, setAssetsSummary] = useState<{ summary: string; assetCount: string } | null>(null);
  const [followupText, setFollowupText] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    getProjectsList().then(setProjects);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProject(null);
      setDrafts([]);
      setChecklist(null);
      setEmailDraft(null);
      setAssetsSummary(null);
      setFollowupText(null);
      return;
    }
    getProjectDetail(selectedId).then((p) => {
      if (p) {
        setProject(p);
        setDeliveryNotes(p.deliverables ?? "");
      }
    });
    getProjectDrafts(selectedId).then((d) =>
      setDrafts(d.map((x) => ({ type: x.type, content: x.content, createdAt: x.createdAt })))
    );
  }, [selectedId]);

  async function handleGenerateChecklist() {
    if (!selectedId) return;
    setPending("checklist");
    try {
      const res = await generateDeliveryChecklistAction(selectedId);
      if (!("error" in res)) {
        setChecklist(res.items);
        setDrafts(await getProjectDrafts(selectedId).then((d) => d.map((x) => ({ type: x.type, content: x.content, createdAt: x.createdAt }))));
      }
    } finally {
      setPending(null);
    }
  }

  async function handleGenerateEmail() {
    if (!selectedId) return;
    setPending("email");
    try {
      const res = await generateDeliveryEmailAction(selectedId);
      if (!("error" in res)) {
        setEmailDraft({ subject: res.subject, body: res.body });
        setDrafts(await getProjectDrafts(selectedId).then((d) => d.map((x) => ({ type: x.type, content: x.content, createdAt: x.createdAt }))));
      }
    } finally {
      setPending(null);
    }
  }

  async function handleSummarizeAssets() {
    if (!selectedId) return;
    setPending("assets");
    try {
      const res = await summarizeAssetsAction(selectedId);
      if (!("error" in res)) setAssetsSummary({ summary: res.summary, assetCount: res.assetCount });
    } finally {
      setPending(null);
    }
  }

  async function handleGenerateFollowup() {
    if (!selectedId) return;
    setPending("followup");
    try {
      const res = await generateFollowupAction(selectedId);
      if (!("error" in res)) setFollowupText(res.text);
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    if (projects.length > 0 && !selectedId) setSelectedId(projects[0].id);
  }, [projects, selectedId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="project" className="block text-sm font-medium text-white/70">
            Project
          </label>
          <select
            id="project"
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="mt-1 w-full max-w-xs rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white/95 sm:max-w-sm"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {project && (
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-white/70">
              Delivery status
            </label>
            <select
              id="status"
              value={project.status ?? "editing"}
              onChange={(e) => updateProjectStatus(selectedId!, e.target.value)}
              className="mt-1 rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95"
            >
              {["planned", "shot_complete", "editing_in_progress", "ready_for_delivery", "delivered"].map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedId ? (
        <EmptyState
          title="Select a project"
          description="Choose a project to prepare delivery materials."
        />
      ) : !project ? (
        <p className="text-sm text-white/50">Loading…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Checklist
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateChecklist}
                  disabled={!!pending}
                  className="rounded-studio-base border border-accent-border bg-accent/10 px-3 py-2 text-sm font-medium text-white/95 hover:bg-accent/15 disabled:opacity-50"
                >
                  {pending === "checklist" ? "Generating…" : "Generate checklist"}
                </button>
              </div>
              {checklist && (
                <ul className="mt-4 space-y-1.5">
                  {checklist.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white/85">
                      <span className="text-white/40">[ ]</span> {item}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Client email draft
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateEmail}
                  disabled={!!pending}
                  className="rounded-studio-base border border-accent-border bg-accent/10 px-3 py-2 text-sm font-medium text-white/95 hover:bg-accent/15 disabled:opacity-50"
                >
                  {pending === "email" ? "Generating…" : "Generate email draft"}
                </button>
              </div>
              {emailDraft && (
                <div className="mt-4 rounded-studio-base border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs text-white/50">Subject</p>
                  <p className="mt-0.5 text-sm text-white/90">{emailDraft.subject}</p>
                  <p className="mt-3 text-xs text-white/50">Body</p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-white/85">{emailDraft.body}</pre>
                  <p className="mt-3 text-[10px] text-white/45">Awaiting approval to save. Check Approvals page.</p>
                </div>
              )}
            </Panel>

            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Delivery notes
              </p>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                onBlur={() => selectedId && updateProjectDeliveryNotes(selectedId, deliveryNotes)}
                rows={4}
                placeholder="Notes for delivery…"
                className="mt-2 w-full rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/95 placeholder-white/40"
              />
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Final assets summary
              </p>
              <button
                type="button"
                onClick={handleSummarizeAssets}
                disabled={!!pending}
                className="mt-3 rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/[0.05] disabled:opacity-50"
              >
                {pending === "assets" ? "Summarizing…" : "Summarize assets"}
              </button>
              {assetsSummary && (
                <div className="mt-4">
                  <p className="text-sm text-white/90">{assetsSummary.summary}</p>
                  {assetsSummary.assetCount !== "—" && (
                    <p className="mt-1 text-xs text-white/55">Asset count: {assetsSummary.assetCount}</p>
                  )}
                </div>
              )}
            </Panel>

            <Panel padding="base">
              <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                Follow-up reminder
              </p>
              <button
                type="button"
                onClick={handleGenerateFollowup}
                disabled={!!pending}
                className="mt-3 rounded-studio-base border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/[0.05] disabled:opacity-50"
              >
                {pending === "followup" ? "Generating…" : "Generate follow-up text"}
              </button>
              {followupText && (
                <p className="mt-4 text-sm text-white/85">{followupText}</p>
              )}
            </Panel>

            {drafts.length > 0 && (
              <Panel padding="base">
                <p className="font-display text-xs font-medium uppercase tracking-[0.15em] text-white/55">
                  Saved drafts
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/75">
                  {drafts.map((d, i) => (
                    <li key={i}>
                      <span className="text-white/50">{d.type}</span> · {new Date(d.createdAt).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-white/40">
        No actual email sending or file upload. Drafts and checklists only.
      </p>
    </div>
  );
}
