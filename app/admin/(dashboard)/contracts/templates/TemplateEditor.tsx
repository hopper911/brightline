"use client";

import { DocumentTemplateType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TYPES = Object.values(DocumentTemplateType);

type Props = {
  mode: "create" | "edit";
  templateId?: string;
  initial?: {
    title: string;
    type: DocumentTemplateType;
    description: string | null;
    contentHtml: string;
    variables: string;
    isActive: boolean;
    version: number;
    genAiEnabled: boolean;
    genAiSystemPrompt: string | null;
    genAiUserPrompt: string | null;
    genAiModel: string | null;
  };
};

export function TemplateEditor({ mode, templateId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<DocumentTemplateType>(initial?.type ?? DocumentTemplateType.OTHER);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [contentHtml, setContentHtml] = useState(initial?.contentHtml ?? "");
  const [variables, setVariables] = useState(initial?.variables ?? '["clientName","clientCompany","todayDate"]');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [genAiEnabled, setGenAiEnabled] = useState(initial?.genAiEnabled ?? false);
  const [genAiSystemPrompt, setGenAiSystemPrompt] = useState(initial?.genAiSystemPrompt ?? "");
  const [genAiUserPrompt, setGenAiUserPrompt] = useState(initial?.genAiUserPrompt ?? "");
  const [genAiModel, setGenAiModel] = useState(initial?.genAiModel ?? "");
  const [operatorMessage, setOperatorMessage] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiPrereqsOk =
    genAiEnabled &&
    ((genAiSystemPrompt ?? "").trim().length > 0 || (genAiUserPrompt ?? "").trim().length > 0);

  async function save(bumpVersion: boolean) {
    setBusy(true);
    setError(null);
    let vars: string[] = [];
    try {
      const parsed = JSON.parse(variables || "[]") as unknown;
      if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
        throw new Error("Variables must be a JSON array of strings.");
      }
      vars = parsed;
    } catch {
      setError("Variables must be valid JSON string array.");
      setBusy(false);
      return;
    }
    const url =
      mode === "create"
        ? "/api/admin/contracts/templates"
        : `/api/admin/contracts/templates/${templateId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        description: description || null,
        contentHtml,
        variables: vars,
        isActive,
        genAiEnabled,
        genAiSystemPrompt: genAiSystemPrompt.trim() || null,
        genAiUserPrompt: genAiUserPrompt.trim() || null,
        genAiModel: genAiModel.trim() || null,
        ...(mode === "edit" ? { bumpVersion } : {}),
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; template?: { id: string } };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Save failed.");
      return;
    }
    if (mode === "create" && data.template?.id) {
      router.push(`/admin/contracts/templates/${data.template.id}`);
    } else {
      router.refresh();
    }
  }

  async function runAiDraft(mode: "refine" | "replace") {
    if (!title.trim()) {
      setAiError("Set a title before generating.");
      return;
    }
    if (mode === "replace" && contentHtml.trim()) {
      const ok = window.confirm(
        "Replace the entire HTML body with new AI output? This cannot be undone from here (use Save after reviewing)."
      );
      if (!ok) return;
    }
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/admin/contracts/templates/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genAiEnabled,
          genAiSystemPrompt: genAiSystemPrompt.trim() || null,
          genAiUserPrompt: genAiUserPrompt.trim() || null,
          genAiModel: genAiModel.trim() || null,
          title: title.trim(),
          type,
          contentHtml,
          operatorMessage: operatorMessage.trim() || null,
          mode,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; html?: string };
      if (!res.ok || !data.ok || !data.html) {
        setAiError(data.error ?? "Generation failed.");
        return;
      }
      setContentHtml(data.html);
    } catch {
      setAiError("Network error.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-white">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}
      {aiError && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {aiError}
        </div>
      )}
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Title</span>
        <input
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Type</span>
        <select
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value as DocumentTemplateType)}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Description</span>
        <input
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/45">Generative AI</p>
        <p className="text-xs text-white/45">
          Generation runs on the server using your OpenAI credentials. Review all output before saving—templates may affect
          legal or client-facing documents.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={genAiEnabled} onChange={(e) => setGenAiEnabled(e.target.checked)} />
          Enable AI assist for this template
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/60">System / style rules</span>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs leading-relaxed"
            value={genAiSystemPrompt}
            onChange={(e) => setGenAiSystemPrompt(e.target.value)}
            placeholder="Tone, legal guardrails, format expectations…"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/60">Default operator prompt</span>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs leading-relaxed"
            value={genAiUserPrompt}
            onChange={(e) => setGenAiUserPrompt(e.target.value)}
            placeholder="Instruction template; you can reference variables like {{clientName}}…"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/60">Model id (optional)</span>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
            value={genAiModel}
            onChange={(e) => setGenAiModel(e.target.value)}
            placeholder="e.g. openai/gpt-4o-mini — leave empty for workspace default"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/60">Instructions for this run (optional)</span>
          <textarea
            className="h-20 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
            value={operatorMessage}
            onChange={(e) => setOperatorMessage(e.target.value)}
            placeholder="e.g. Add a cancellation clause section using {{clientName}}…"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn border border-white/20 bg-white/5"
            disabled={busy || aiBusy || !aiPrereqsOk}
            onClick={() => runAiDraft("refine")}
          >
            {aiBusy ? "Generating…" : "Refine HTML"}
          </button>
          <button
            type="button"
            className="btn border border-white/20 bg-white/5"
            disabled={busy || aiBusy || !aiPrereqsOk}
            onClick={() => runAiDraft("replace")}
          >
            Replace HTML
          </button>
        </div>
        {!aiPrereqsOk ? (
          <p className="text-xs text-white/40">Enable AI assist and fill at least one prompt field above to generate.</p>
        ) : null}
      </div>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">HTML body (placeholders like {"{{clientName}}"})</span>
        <textarea
          className="min-h-[320px] w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs leading-relaxed"
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-white/60">Variables (JSON string array)</span>
        <textarea
          className="h-24 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
          value={variables}
          onChange={(e) => setVariables(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={busy || aiBusy} onClick={() => save(false)}>
          {mode === "create" ? "Create" : "Save"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            className="btn border border-white/20 bg-white/5"
            disabled={busy || aiBusy}
            onClick={() => save(true)}
          >
            Save & bump version
          </button>
        )}
      </div>
    </div>
  );
}
