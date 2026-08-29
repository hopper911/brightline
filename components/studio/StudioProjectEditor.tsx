"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { pollPlatformJobUntilDone } from "@/lib/admin/poll-platform-job";
import type { StudioProjectEditorView } from "@/lib/studio/projects/get-studio-project-editor";
import { seoLengthHints } from "@/lib/studio/projects/validate-studio-project-section";

type TabId = "overview" | "content" | "media" | "details" | "seo" | "publishing" | "activity";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type ActivityEvent = {
  id: string;
  action: string;
  createdAt: string;
  succeeded: boolean | null;
  metadata: Record<string, unknown> | null;
};

type Props = {
  initialView: StudioProjectEditorView;
  projectRefParam: string;
  canWrite: boolean;
};

const TRANSITION_LABELS: Record<string, string> = {
  IN_REVIEW: "Request review",
  APPROVED: "Approve",
  PUBLISHED: "Publish",
  MEDIA_READY: "Return to editing",
  CONTENT_READY: "Mark content ready",
  DRAFT: "Revert to draft",
  ARCHIVED: "Archive",
};

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "media", label: "Media" },
  { id: "details", label: "Details" },
  { id: "seo", label: "SEO" },
  { id: "publishing", label: "Publishing" },
  { id: "activity", label: "Activity" },
];

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white";
}

function labelClass() {
  return "text-xs uppercase tracking-[0.18em] text-white/45";
}

export function StudioProjectEditor({ initialView, projectRefParam, canWrite }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  const [view, setView] = useState(initialView);
  const [overview, setOverview] = useState(initialView.overview);
  const [content, setContent] = useState(initialView.content);
  const [details, setDetails] = useState(initialView.details);
  const [seo, setSeo] = useState(initialView.seo);
  const [publishing, setPublishing] = useState(initialView.publishing);
  const [media, setMedia] = useState(initialView.media);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [workflow, setWorkflow] = useState(initialView.workflow);
  const [reviewNotes, setReviewNotes] = useState(initialView.workflow.reviewNotes ?? "");
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  const seoHints = useMemo(
    () => seoLengthHints(seo.seoTitle, seo.seoDescription),
    [seo]
  );

  const markDirty = () => {
    setSaveState((s) => (s === "saving" ? s : "dirty"));
    setSaveError(null);
  };

  const saveSection = useCallback(
    async (section: TabId, data: Record<string, unknown>) => {
      if (!canWrite) return;
      setSaveState("saving");
      setSaveError(null);
      try {
        const res = await fetch(`/api/studio/projects/${projectRefParam}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, data }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          jobId?: string;
          view?: StudioProjectEditorView;
        };
        if (!res.ok || !json.ok) {
          setSaveState("error");
          setSaveError(json.error ?? "Save failed.");
          return;
        }
        if (json.jobId) {
          await pollPlatformJobUntilDone(json.jobId);
        }
        if (json.view) {
          setView(json.view);
          setOverview(json.view.overview);
          setContent(json.view.content);
          setDetails(json.view.details);
          setSeo(json.view.seo);
          setPublishing(json.view.publishing);
          setMedia(json.view.media);
        }
        setSaveState("saved");
      } catch {
        setSaveState("error");
        setSaveError("Network error.");
      }
    },
    [canWrite, projectRefParam]
  );

  const runTransition = useCallback(
    async (toLifecycle: string) => {
      if (!canWrite) return;
      setTransitioning(true);
      setTransitionError(null);
      try {
        const res = await fetch(`/api/studio/projects/${projectRefParam}/transition`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toLifecycle, reviewNotes }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          missing?: string[];
          view?: StudioProjectEditorView;
          jobId?: string;
          publicPath?: string | null;
          publishPending?: boolean;
        };
        if (!res.ok || !json.ok) {
          const missing =
            json.missing?.length ? ` Missing: ${json.missing.join(", ")}.` : "";
          setTransitionError(`${json.error ?? "Transition failed."}${missing}`);
          return;
        }
        if (json.jobId) {
          const job = await pollPlatformJobUntilDone(json.jobId);
          if (job.status === "FAILED" || !job.result?.ok) {
            setTransitionError(job.result?.error ?? job.errorSummary ?? "Publish job failed.");
            return;
          }
          const refreshRes = await fetch(`/api/studio/projects/${projectRefParam}`, {
            credentials: "include",
          });
          if (refreshRes.ok) {
            const refreshed = (await refreshRes.json()) as { view?: StudioProjectEditorView };
            if (refreshed.view) {
              json.view = refreshed.view;
            }
          }
        }
        if (json.view) {
          setView(json.view);
          setOverview(json.view.overview);
          setWorkflow(json.view.workflow);
          setReviewNotes(json.view.workflow.reviewNotes ?? "");
          setPublishing(json.view.publishing);
        }
        setActivityLoaded(false);
      } catch {
        setTransitionError("Network error.");
      } finally {
        setTransitioning(false);
      }
    },
    [canWrite, projectRefParam, reviewNotes]
  );

  const saveMedia = useCallback(async () => {
    if (!canWrite) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const body =
        view.kind === "work-project"
          ? {
              heroMediaId: media.heroMediaId,
              order: media.items.map((item, index) => ({
                mediaId: item.id,
                sortOrder: index,
              })),
            }
          : {
              heroImage: media.heroImage,
              thumbnailImage: media.thumbnailImage,
              backgroundMedia: media.backgroundMedia,
            };
      const res = await fetch(`/api/studio/projects/${projectRefParam}/media`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; jobId?: string };
      if (!res.ok || !json.ok) {
        setSaveState("error");
        setSaveError(json.error ?? "Media save failed.");
        return;
      }
      if (json.jobId) await pollPlatformJobUntilDone(json.jobId);
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setSaveError("Network error.");
    }
  }, [canWrite, media, projectRefParam, view.kind]);

  useEffect(() => {
    if (tab !== "activity" || activityLoaded) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/studio/projects/${projectRefParam}/activity`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { events?: ActivityEvent[] };
      if (!cancelled) {
        setActivity(json.events ?? []);
        setActivityLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, activityLoaded, projectRefParam]);

  const moveMedia = (index: number, direction: -1 | 1) => {
    const next = [...media.items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setMedia({ ...media, items: next });
    markDirty();
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/studio/projects" className="text-xs text-white/45 hover:text-white">
            ← Projects
          </Link>
          <h2 className="mt-2 font-display text-2xl text-white">{view.title}</h2>
          <p className="mt-1 text-sm text-white/55">
            {view.tenant} · {view.kind} · {view.lifecycleLabel} · {view.completeness.score}% complete
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {view.previewHref ? (
            <Link
              href={view.previewHref}
              className="rounded border border-white/15 px-3 py-2 text-white/70 hover:text-white"
            >
              Preview draft
            </Link>
          ) : null}
          <Link
            href={view.legacyAdminHref}
            className="rounded border border-white/15 px-3 py-2 text-white/70 hover:text-white"
          >
            Legacy admin
          </Link>
        </div>
      </div>

      {view.completeness.missing.length > 0 ? (
        <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100/90">
          Missing: {view.completeness.missing.join(", ")}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-3 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 ${
              tab === t.id ? "bg-white/10 text-white" : "text-white/55 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {tab === "overview" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className={labelClass()}>Title</p>
              <input
                className={fieldClass()}
                value={String(details.title ?? view.title)}
                disabled={!canWrite}
                onChange={(e) => {
                  setDetails({ ...details, title: e.target.value });
                  markDirty();
                }}
              />
            </div>
            <div>
              <p className={labelClass()}>Slug</p>
              <input
                className={fieldClass()}
                value={String(details.slug ?? view.slug)}
                disabled={!canWrite}
                onChange={(e) => {
                  setDetails({ ...details, slug: e.target.value });
                  markDirty();
                }}
              />
            </div>
            <div className="md:col-span-2">
              <p className={labelClass()}>Summary</p>
              <textarea
                className={fieldClass()}
                rows={3}
                value={overview.summary}
                disabled={!canWrite}
                onChange={(e) => {
                  setOverview({ ...overview, summary: e.target.value });
                  markDirty();
                }}
              />
            </div>
            <div>
              <p className={labelClass()}>Lifecycle</p>
              <p className="mt-2 text-white">{view.lifecycleLabel}</p>
            </div>
            <div className="md:col-span-2">
              <p className={labelClass()}>Internal review notes</p>
              <textarea
                className={fieldClass()}
                rows={2}
                value={reviewNotes}
                disabled={!canWrite}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Short internal notes for reviewers"
              />
            </div>
            {canWrite && workflow.allowedTransitions.length > 0 ? (
              <div className="md:col-span-2 flex flex-wrap gap-2">
                {workflow.allowedTransitions.map((target) => {
                  const needsApprove = target === "APPROVED" || target === "PUBLISHED";
                  if (needsApprove && !workflow.canApprove) return null;
                  return (
                    <button
                      key={target}
                      type="button"
                      disabled={transitioning}
                      className="rounded border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                      onClick={() => runTransition(target)}
                    >
                      {TRANSITION_LABELS[target] ?? target}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {transitionError ? (
              <p className="md:col-span-2 text-sm text-red-300">{transitionError}</p>
            ) : null}
            <div>
              <p className={labelClass()}>Updated</p>
              <p className="mt-2 text-white/70">{new Date(view.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        ) : null}

        {tab === "content" ? (
          <div className="space-y-4">
            {view.kind === "work-project" ? (
              <>
                <label className="block text-sm">
                  <span className={labelClass()}>Description</span>
                  <textarea
                    className={fieldClass()}
                    rows={4}
                    value={String(content.description ?? "")}
                    disabled={!canWrite}
                    onChange={(e) => {
                      setContent({ ...content, description: e.target.value });
                      markDirty();
                    }}
                  />
                </label>
                {(["opening", "context", "approach", "execution", "closing"] as const).map((key) => (
                  <label key={key} className="block text-sm">
                    <span className={labelClass()}>{key}</span>
                    <textarea
                      className={fieldClass()}
                      rows={3}
                      value={String(content[key] ?? "")}
                      disabled={!canWrite}
                      onChange={(e) => {
                        setContent({ ...content, [key]: e.target.value });
                        markDirty();
                      }}
                    />
                  </label>
                ))}
              </>
            ) : (
              <>
                {(["challenge", "outcome", "role", "duration"] as const).map((key) => (
                  <label key={key} className="block text-sm">
                    <span className={labelClass()}>{key}</span>
                    <textarea
                      className={fieldClass()}
                      rows={3}
                      value={String(content[key] ?? "")}
                      disabled={!canWrite}
                      onChange={(e) => {
                        setContent({ ...content, [key]: e.target.value });
                        markDirty();
                      }}
                    />
                  </label>
                ))}
                <label className="block text-sm">
                  <span className={labelClass()}>Sections (structured JSON)</span>
                  <textarea
                    className={fieldClass()}
                    rows={8}
                    value={JSON.stringify(content.sections ?? [], null, 2)}
                    disabled={!canWrite}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setContent({ ...content, sections: parsed });
                        markDirty();
                      } catch {
                        /* allow typing */
                      }
                    }}
                  />
                </label>
              </>
            )}
          </div>
        ) : null}

        {tab === "media" ? (
          <div className="space-y-4">
            {view.kind === "work-project" ? (
              <>
                <p className="text-sm text-white/55">Gallery order is explicit — use arrows, then save media.</p>
                <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
                  {media.items.map((item, index) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="text-white">{item.keyFull ?? item.id}</p>
                        <p className="text-xs text-white/45">
                          {item.isHero ? "Hero" : "Gallery"} · order {index}
                        </p>
                      </div>
                      {canWrite ? (
                        <div className="flex gap-1">
                          <button type="button" className="rounded border border-white/15 px-2 py-1 text-xs" onClick={() => moveMedia(index, -1)}>↑</button>
                          <button type="button" className="rounded border border-white/15 px-2 py-1 text-xs" onClick={() => moveMedia(index, 1)}>↓</button>
                          <button
                            type="button"
                            className="rounded border border-white/15 px-2 py-1 text-xs"
                            onClick={() => {
                              setMedia({ ...media, heroMediaId: item.id, items: media.items.map((m) => ({ ...m, isHero: m.id === item.id })) });
                              markDirty();
                            }}
                          >
                            Set hero
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <label className="block text-sm">
                  <span className={labelClass()}>Hero image key</span>
                  <input
                    className={fieldClass()}
                    value={media.heroImage ?? ""}
                    disabled={!canWrite}
                    onChange={(e) => {
                      setMedia({ ...media, heroImage: e.target.value });
                      markDirty();
                    }}
                  />
                </label>
                <label className="block text-sm">
                  <span className={labelClass()}>Thumbnail key</span>
                  <input
                    className={fieldClass()}
                    value={media.thumbnailImage ?? ""}
                    disabled={!canWrite}
                    onChange={(e) => {
                      setMedia({ ...media, thumbnailImage: e.target.value });
                      markDirty();
                    }}
                  />
                </label>
              </>
            )}
            <Link href={`/studio/media?tenant=${view.tenant}`} className="text-sm text-white/60 hover:text-white">
              Browse tenant asset registry →
            </Link>
          </div>
        ) : null}

        {tab === "details" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(details).map(([key, value]) => {
              if (Array.isArray(value)) {
                return (
                  <label key={key} className="block text-sm md:col-span-2">
                    <span className={labelClass()}>{key}</span>
                    <input
                      className={fieldClass()}
                      value={value.join(", ")}
                      disabled={!canWrite}
                      onChange={(e) => {
                        setDetails({
                          ...details,
                          [key]: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        });
                        markDirty();
                      }}
                    />
                  </label>
                );
              }
              return (
                <label key={key} className="block text-sm">
                  <span className={labelClass()}>{key}</span>
                  <input
                    className={fieldClass()}
                    value={value == null ? "" : String(value)}
                    disabled={!canWrite}
                    onChange={(e) => {
                      setDetails({ ...details, [key]: e.target.value });
                      markDirty();
                    }}
                  />
                </label>
              );
            })}
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className={labelClass()}>Meta title ({seoHints.titleLen}/{seoHints.titleSoftMax})</span>
              <input
                className={fieldClass()}
                value={seo.seoTitle ?? ""}
                disabled={!canWrite}
                onChange={(e) => {
                  setSeo({ ...seo, seoTitle: e.target.value });
                  markDirty();
                }}
              />
            </label>
            <label className="block text-sm">
              <span className={labelClass()}>Meta description ({seoHints.descLen}/{seoHints.descSoftMax})</span>
              <textarea
                className={fieldClass()}
                rows={3}
                value={seo.seoDescription ?? ""}
                disabled={!canWrite}
                onChange={(e) => {
                  setSeo({ ...seo, seoDescription: e.target.value });
                  markDirty();
                }}
              />
            </label>
            <p className="text-sm text-white/50">Slug preview: /{seo.slug}</p>
          </div>
        ) : null}

        {tab === "publishing" ? (
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Completeness: {view.completeness.score}% — {view.completeness.complete ? "ready" : "not ready"}
            </p>
            {!workflow.publishAllowed ? (
              <p className="text-sm text-amber-100/80">
                Publication requires approval and passing completeness checks.
              </p>
            ) : null}
            {view.kind === "work-project" ? (
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={publishing.published}
                  disabled={
                    !canWrite ||
                    (!workflow.publishAllowed && !publishing.published)
                  }
                  onChange={(e) => {
                    setPublishing({ ...publishing, published: e.target.checked });
                    markDirty();
                  }}
                />
                Published on Brightline
              </label>
            ) : (
              <>
                <label className="block text-sm">
                  <span className={labelClass()}>Hub status</span>
                  <select
                    className={fieldClass()}
                    value={publishing.hubStatus ?? "DRAFT"}
                    disabled={
                      !canWrite ||
                      (!workflow.publishAllowed && publishing.hubStatus !== "PUBLISHED")
                    }
                    onChange={(e) => {
                      setPublishing({ ...publishing, hubStatus: e.target.value });
                      markDirty();
                    }}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={publishing.publishMirotech}
                    disabled={!canWrite}
                    onChange={(e) => {
                      setPublishing({ ...publishing, publishMirotech: e.target.checked });
                      markDirty();
                    }}
                  />
                  Publish to MiroTech
                </label>
              </>
            )}
            <Link href="/studio/publishing" className="text-sm text-white/60 hover:text-white">
              View publishing jobs →
            </Link>
          </div>
        ) : null}

        {tab === "activity" ? (
          <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
            {activity.length === 0 ? (
              <li className="px-4 py-6 text-sm text-white/55">No major events recorded yet.</li>
            ) : (
              activity.map((event) => (
                <li key={event.id} className="px-4 py-3 text-sm">
                  <p className="text-white">{event.action}</p>
                  <p className="text-xs text-white/45">{new Date(event.createdAt).toLocaleString()}</p>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {canWrite && tab !== "activity" ? (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
            onClick={() => {
              if (tab === "media") saveMedia();
              else if (tab === "overview") saveSection("overview", { ...details, summary: overview.summary });
              else if (tab === "content") saveSection("content", content);
              else if (tab === "details") saveSection("details", details);
              else if (tab === "seo") {
                if (view.kind === "work-project") {
                  saveSection("seo", {
                    seoTitle: seo.seoTitle,
                    metaDescription: seo.seoDescription,
                  });
                } else {
                  saveSection("seo", seo);
                }
              } else if (tab === "publishing") {
                if (view.kind === "work-project") {
                  saveSection("publishing", { published: publishing.published });
                } else {
                  saveSection("publishing", {
                    status: publishing.hubStatus,
                    publishMirotech: publishing.publishMirotech,
                    publishBrightline: publishing.publishBrightline,
                  });
                }
              }
            }}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? "Saving…" : "Save section"}
          </button>
          <span className="text-xs text-white/45">
            {saveState === "dirty" ? "Unsaved changes" : null}
            {saveState === "saved" ? "Saved" : null}
            {saveState === "error" ? saveError : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}
