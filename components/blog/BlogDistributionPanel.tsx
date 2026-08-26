"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogPost } from "@/lib/blog-post-model";

type WorkOption = {
  id: string;
  title: string;
  slug: string;
  pillarSlug: string;
};

type Props = {
  post: BlogPost;
  onChange: (patch: Partial<BlogPost>) => void;
};

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm text-white/85">{label}</span>
        <span className="mt-0.5 block text-xs text-white/45">{hint}</span>
      </span>
    </label>
  );
}

export default function BlogDistributionPanel({ post, onChange }: Props) {
  const published = post.status === "PUBLISHED";
  const [workOptions, setWorkOptions] = useState<WorkOption[]>([]);
  const [workSearch, setWorkSearch] = useState("");
  const [workLoading, setWorkLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setWorkLoading(true);
        try {
          const qs = workSearch.trim()
            ? `?search=${encodeURIComponent(workSearch.trim())}`
            : "";
          const res = await fetch(`/api/admin/work-projects${qs}`, {
            credentials: "include",
          });
          const json = (await res.json()) as {
            ok?: boolean;
            projects?: Array<{
              id: string;
              title: string;
              slug: string;
              section?: string;
            }>;
            sectionToPillar?: Record<string, string>;
          };
          if (cancelled || !res.ok || !json.ok || !json.projects) return;
          const map = json.sectionToPillar || {};
          setWorkOptions(
            json.projects.slice(0, 80).map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              pillarSlug: (p.section && map[p.section]) || "",
            }))
          );
        } catch {
          if (!cancelled) setWorkOptions([]);
        } finally {
          if (!cancelled) setWorkLoading(false);
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [workSearch]);

  const selectedWorkLabel = useMemo(() => {
    const match = workOptions.find((w) => w.id === post.linkedWorkProjectId);
    if (match) return match.title;
    if (post.linkedWorkSlug) return post.linkedWorkSlug;
    return "";
  }, [workOptions, post.linkedWorkProjectId, post.linkedWorkSlug]);

  function applyWork(option: WorkOption | null) {
    if (!option) {
      onChange({ linkedWorkProjectId: "", linkedWorkSlug: "" });
      return;
    }
    const path = option.pillarSlug
      ? `${option.pillarSlug}/${option.slug}`
      : option.slug;
    onChange({
      linkedWorkProjectId: option.id,
      linkedWorkSlug: path,
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Distribution</p>
        <p className="mt-1 text-sm text-white/65">
          Control where this post appears on the site. Master gate is Publish (above).
          {!published ? " Publish the post before site surfaces go live." : null}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Toggle
          label="Show in Journal"
          hint="Appear on /blog index"
          checked={post.showInJournal !== false}
          onChange={(showInJournal) => onChange({ showInJournal })}
        />
        <Toggle
          label="Show in Travel"
          hint="Appear on /travel index"
          checked={Boolean(post.showInTravel)}
          onChange={(showInTravel) => onChange({ showInTravel })}
        />
        <Toggle
          label="Feature on Homepage"
          hint="Journal strip on the home page"
          checked={Boolean(post.featureOnHome)}
          onChange={(featureOnHome) => onChange({ featureOnHome })}
        />
        <Toggle
          label="Feature in Case Studies"
          hint="List on /case-studies"
          checked={Boolean(post.featureInCaseStudies)}
          onChange={(featureInCaseStudies) => onChange({ featureInCaseStudies })}
        />
        <Toggle
          label="Also on Mirotech"
          hint={
            post.mirotechJournalId
              ? "Synced — appears on mirotech.solutions/journal when Published"
              : !published
                ? "Check this, then Publish + Save to push live to Mirotech"
                : "Save to publish a copy on mirotech.solutions/journal"
          }
          checked={Boolean(post.publishToMirotech)}
          onChange={(publishToMirotech) => onChange({ publishToMirotech })}
        />
      </div>
      {post.publishToMirotech && post.mirotechJournalId ? (
        <p className="text-xs text-white/50">
          Mirotech journal id:{" "}
          <span className="font-mono text-white/70">{post.mirotechJournalId}</span>
          {" · "}
          <a
            href={`https://mirotech.solutions/journal/${encodeURIComponent(post.slug)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            View on Mirotech
          </a>
        </p>
      ) : null}

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-sm text-white/70">Linked Work project</p>
        <p className="text-xs text-white/45">
          Pick a Work project to link from the post. Search filters the list.
          {selectedWorkLabel ? ` Current: ${selectedWorkLabel}` : ""}
        </p>
        <input
          value={workSearch}
          onChange={(e) => setWorkSearch(e.target.value)}
          placeholder="Search Work projects…"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
        />
        <select
          value={post.linkedWorkProjectId || ""}
          onChange={(e) => {
            const id = e.target.value;
            const opt = workOptions.find((w) => w.id === id) ?? null;
            applyWork(opt);
          }}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
        >
          <option value="">No linked Work</option>
          {workOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
              {w.pillarSlug ? ` · ${w.pillarSlug}` : ""}
            </option>
          ))}
        </select>
        {workLoading ? <p className="text-xs text-white/40">Loading projects…</p> : null}
        <label>
          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
            Linked Work slug (auto-filled)
          </span>
          <input
            value={post.linkedWorkSlug || ""}
            onChange={(e) => onChange({ linkedWorkSlug: e.target.value })}
            placeholder="e.g. architecture/project-slug"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white"
          />
        </label>
      </div>
    </section>
  );
}
