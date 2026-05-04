"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { WebsiteBlock, WebsiteBlockItem, WebsiteBlockType, WebsitePage } from "@/lib/website-pages";
import type { SiteTheme } from "@/lib/site-theme";
import type { SiteNavItem } from "@/lib/site-nav";
import type { WorkPillarNavItem } from "@/lib/work-pillar-settings";
import { mergeWorkPillarNavIntoSiteNav } from "@/lib/site-nav";
import { getPublicR2Url } from "@/lib/r2";
import R2BrowserModal from "../work/R2BrowserModal";

const BLOCK_TYPES: WebsiteBlockType[] = ["hero", "gallery", "stats", "text", "cards", "list", "cta", "contactForm"];

const BLOCK_TYPE_LABEL: Record<WebsiteBlockType, string> = {
  hero: "hero",
  gallery: "gallery (full-page background)",
  stats: "stats",
  text: "text",
  cards: "cards",
  list: "list",
  cta: "cta",
  contactForm: "contactForm",
};
const FONT_OPTIONS = [
  { value: "inter", label: "Inter" },
  { value: "montserrat", label: "Montserrat" },
  { value: "system", label: "System Sans" },
  { value: "serif", label: "Editorial Serif" },
  { value: "mono", label: "Mono" },
];

type R2Target =
  | { kind: "blockMedia"; blockId: string }
  | { kind: "blockPoster"; blockId: string }
  | { kind: "itemMedia"; blockId: string }
  | { kind: "themeBackgroundMedia" }
  | { kind: "themeBackgroundPoster" };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function id(prefix = "page") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function blankBlock(type: WebsiteBlockType): WebsiteBlock {
  return {
    id: id("block"),
    type,
    label: `${type} block`,
    eyebrow: "",
    title: type === "contactForm" ? "Let's talk details." : "Block title",
    body: type === "contactForm" ? "Email to discuss timelines, scope, and usage needs." : "Block copy.",
    mediaUrl: "",
    posterUrl: "",
    items:
      type === "stats"
        ? [
            { title: "500+", body: "Projects", meta: "Delivered since 2019" },
            { title: "48hr", body: "Response time", meta: "Initial inquiry" },
          ]
        : type === "cards" || type === "list"
          ? [{ title: "Item title", body: "Item copy.", meta: "" }]
          : [],
    ctaLabel:
      type === "cta" || type === "hero"
        ? "Contact"
        : type === "gallery"
          ? "Enter gallery"
          : "",
    ctaHref:
      type === "cta" || type === "hero"
        ? "/contact"
        : type === "gallery"
          ? "/galleries"
          : "",
  };
}

function newPage(title = "New Page"): WebsitePage {
  const slug = slugify(title) || "new-page";
  return {
    id: id(),
    slug,
    title,
    eyebrow: "BRIGHTLINE Photography",
    description: "Short page introduction.",
    body: "Write the page content here.",
    ctaLabel: "Contact",
    ctaHref: "/contact",
    status: "DRAFT",
    updatedAt: new Date().toISOString(),
    blocks: [
      {
        ...blankBlock("hero"),
        label: "Hero",
        title,
        body: "Short page introduction.",
      },
    ],
  };
}

function itemsToLines(items: WebsiteBlockItem[]) {
  return items.map((item) => `${item.title} | ${item.body} | ${item.meta ?? ""} | ${item.mediaUrl ?? ""}`).join("\n");
}

function linesToItems(value: string): WebsiteBlockItem[] {
  return value
    .split("\n")
    .map((line) => {
      const [title = "", body = "", meta = "", mediaUrl = ""] = line.split("|").map((part) => part.trim());
      return title || body || meta || mediaUrl ? { title, body, ...(meta ? { meta } : {}), ...(mediaUrl ? { mediaUrl } : {}) } : null;
    })
    .filter(Boolean) as WebsiteBlockItem[];
}

async function uploadSiteMedia(file: File, folder = "pages") {
  const res = await fetch("/api/admin/site-media/upload-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    url?: string;
    key?: string;
    publicUrl?: string;
    headers?: Record<string, string>;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.url || !data.key) {
    throw new Error(data.error ?? "Could not prepare upload.");
  }
  const put = await fetch(data.url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream", ...(data.headers ?? {}) },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Storage upload failed (${put.status}).`);
  }
  const finalizeRes = await fetch("/api/admin/site-media/finalize", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: data.key }),
  });
  const finalized = (await finalizeRes.json()) as { ok?: boolean; publicUrl?: string; error?: string };
  if (!finalizeRes.ok || !finalized.ok || !finalized.publicUrl) {
    throw new Error(finalized.error ?? "Upload finalization failed.");
  }
  return finalized.publicUrl;
}

export default function WebsitePagesClient({
  initialPages,
  initialTheme,
  initialNav,
}: {
  initialPages: WebsitePage[];
  initialTheme: SiteTheme;
  initialNav: SiteNavItem[];
}) {
  const [pages, setPages] = useState<WebsitePage[]>(initialPages);
  const [theme, setTheme] = useState<SiteTheme>(initialTheme);
  const [nav, setNav] = useState<SiteNavItem[]>(initialNav);
  const [pillarNav, setPillarNav] = useState<WorkPillarNavItem[]>([]);
  const [selectedId, setSelectedId] = useState(initialPages[0]?.id ?? "");
  const [selectedBlockId, setSelectedBlockId] = useState(initialPages[0]?.blocks[0]?.id ?? "");
  const [newBlockType, setNewBlockType] = useState<WebsiteBlockType>("text");
  const [r2Target, setR2Target] = useState<R2Target | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPillars() {
      try {
        const res = await fetch("/api/admin/work-pillars", { credentials: "include" });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          pillars?: Array<{ slug: string; label: string; visible?: boolean }>;
        };
        if (!res.ok || !json.ok || !Array.isArray(json.pillars)) return;
        const next = json.pillars
          .filter((p) => p && p.visible !== false)
          .map((p) => ({ slug: p.slug, href: `/work/${p.slug}`, label: p.label })) satisfies WorkPillarNavItem[];
        setPillarNav(next);
      } catch {
        // ignore — preview stays empty
      }
    }
    void loadPillars();
  }, []);

  const navWithPillarsPreview = useMemo(
    () => mergeWorkPillarNavIntoSiteNav(nav, pillarNav),
    [nav, pillarNav]
  );

  const workHubVisible = useMemo(() => {
    return navWithPillarsPreview.some((i) => (i.id === "work" || i.id === "projects") && i.visible);
  }, [navWithPillarsPreview]);

  const autoPillarLinks = useMemo(
    () => navWithPillarsPreview.filter((i) => i.id.startsWith("work_pillar_") && i.visible),
    [navWithPillarsPreview]
  );

  const selected = useMemo(
    () => pages.find((page) => page.id === selectedId) ?? pages[0],
    [pages, selectedId]
  );
  const selectedBlock = selected?.blocks.find((block) => block.id === selectedBlockId) ?? selected?.blocks[0];

  function setDirty() {
    setStatus("idle");
  }

  function updateSelected(patch: Partial<WebsitePage>) {
    if (!selected) return;
    setPages((current) =>
      current.map((page) => (page.id === selected.id ? { ...page, ...patch } : page))
    );
    setDirty();
  }

  function updateBlock(blockId: string, patch: Partial<WebsiteBlock>) {
    if (!selected) return;
    updateSelected({
      blocks: selected.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    });
  }

  async function useR2Keys(keys: string[]) {
    if (!r2Target) return;
    const urls = keys.map(getPublicR2Url).filter(Boolean);
    if (urls.length === 0) return;
    if (r2Target.kind === "themeBackgroundMedia") {
      updateTheme({ backgroundMediaUrl: urls[0] ?? "", backgroundMediaEnabled: true });
      return;
    }
    if (r2Target.kind === "themeBackgroundPoster") {
      updateTheme({ backgroundPosterUrl: urls[0] ?? "" });
      return;
    }
    if (!selected) return;
    const block = selected.blocks.find((item) => item.id === r2Target.blockId);
    if (!block) return;

    if (r2Target.kind === "blockMedia") {
      updateBlock(block.id, { mediaUrl: urls[0] ?? "" });
      return;
    }
    if (r2Target.kind === "blockPoster") {
      updateBlock(block.id, { posterUrl: urls[0] ?? "" });
      return;
    }

    updateBlock(block.id, {
      items: [
        ...block.items,
        ...urls.map((url, index) => ({
          title: `R2 media ${block.items.length + index + 1}`,
          body: "Update this caption.",
          mediaUrl: url,
        })),
      ],
    });
  }

  function addPage() {
    const title = prompt("New page title?");
    if (!title) return;
    const base = slugify(title) || "new-page";
    let slug = base;
    let i = 2;
    while (pages.some((page) => page.slug === slug)) {
      slug = `${base}-${i}`;
      i += 1;
    }
    const page = { ...newPage(title.trim()), slug };
    setPages((current) => [...current, page]);
    setSelectedId(page.id);
    setSelectedBlockId(page.blocks[0]?.id ?? "");
    setDirty();
  }

  function deletePage() {
    if (!selected) return;
    if (selected.managed) {
      alert("Core site pages cannot be deleted. Set them to Draft to disable the override.");
      return;
    }
    if (!confirm(`Delete "${selected.title}"? Save changes after deleting.`)) return;
    const next = pages.filter((page) => page.id !== selected.id);
    setPages(next);
    setSelectedId(next[0]?.id ?? "");
    setSelectedBlockId(next[0]?.blocks[0]?.id ?? "");
    setDirty();
  }

  function addBlock() {
    if (!selected) return;
    const block = blankBlock(newBlockType);
    updateSelected({ blocks: [...selected.blocks, block] });
    setSelectedBlockId(block.id);
  }

  function deleteBlock(blockId: string) {
    if (!selected) return;
    if (!confirm("Delete this block? Save changes after deleting.")) return;
    const next = selected.blocks.filter((block) => block.id !== blockId);
    updateSelected({ blocks: next });
    setSelectedBlockId(next[0]?.id ?? "");
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    if (!selected) return;
    const index = selected.blocks.findIndex((block) => block.id === blockId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= selected.blocks.length) return;
    const next = [...selected.blocks];
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
    updateSelected({ blocks: next });
  }

  function pagesWithSelectedStatus(nextStatus?: WebsitePage["status"]) {
    if (!selected || !nextStatus) return pages;
    return pages.map((page) =>
      page.id === selected.id ? { ...page, status: nextStatus } : page
    );
  }

  async function save(options?: { publishSelected?: boolean }) {
    setStatus("saving");
    setError("");
    const payloadPages = options?.publishSelected ? pagesWithSelectedStatus("PUBLISHED") : pages;
    try {
      const res = await fetch("/api/admin/website-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pages: payloadPages }),
      });
      const json = (await res.json()) as { ok?: boolean; pages?: WebsitePage[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");

      const navRes = await fetch("/api/admin/site-nav", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nav }),
      });
      const navJson = (await navRes.json()) as { ok?: boolean; nav?: SiteNavItem[]; error?: string };
      if (!navRes.ok || !navJson.ok) throw new Error(navJson.error ?? "Navigation save failed.");

      setPages(json.pages ?? payloadPages);
      setNav(navJson.nav ?? nav);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  }

  async function saveTheme() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/admin/site-theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ theme }),
      });
      const json = (await res.json()) as { ok?: boolean; theme?: SiteTheme; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Theme save failed.");
      setTheme(json.theme ?? theme);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Theme save failed.");
      setStatus("error");
    }
  }

  async function saveNav() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/admin/site-nav", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nav }),
      });
      const json = (await res.json()) as { ok?: boolean; nav?: SiteNavItem[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Navigation save failed.");
      setNav(json.nav ?? nav);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Navigation save failed.");
      setStatus("error");
    }
  }

  function updateTheme(patch: Partial<SiteTheme>) {
    setTheme((current) => ({ ...current, ...patch }));
    setDirty();
  }

  async function uploadBlockMedia(blockId: string, file: File, target: "mediaUrl" | "posterUrl") {
    setStatus("saving");
    setError("");
    try {
      const publicUrl = await uploadSiteMedia(file, "pages");
      updateBlock(blockId, { [target]: publicUrl } as Partial<WebsiteBlock>);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function uploadThemeMedia(file: File, target: "backgroundMediaUrl" | "backgroundPosterUrl") {
    setStatus("saving");
    setError("");
    try {
      const publicUrl = await uploadSiteMedia(file, "theme");
      updateTheme({
        [target]: publicUrl,
        ...(target === "backgroundMediaUrl" ? { backgroundMediaEnabled: true } : {}),
      } as Partial<SiteTheme>);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  function updateNavItem(id: string, patch: Partial<SiteNavItem>) {
    setNav((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setDirty();
  }

  function moveNavItem(id: string, direction: -1 | 1) {
    const index = nav.findIndex((item) => item.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= nav.length) return;
    const next = [...nav];
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
    setNav(next);
    setDirty();
  }

  async function uploadItemMedia(blockId: string, files: FileList | null) {
    if (!selected || !files?.length) return;
    const block = selected.blocks.find((item) => item.id === blockId);
    if (!block) return;
    setStatus("saving");
    setError("");
    try {
      const urls = await Promise.all(Array.from(files).map((file) => uploadSiteMedia(file, "pages")));
      updateBlock(block.id, {
        items: [
          ...block.items,
          ...urls.map((url, index) => ({
            title: `Uploaded media ${block.items.length + index + 1}`,
            body: "Update this caption.",
            mediaUrl: url,
          })),
        ],
      });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <R2BrowserModal
        isOpen={r2Target !== null}
        onClose={() => setR2Target(null)}
        onAddKeys={useR2Keys}
        mode={r2Target?.kind === "itemMedia" ? "multiple" : "single"}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Public site</p>
          <h1 className="mt-2 font-display text-4xl text-white">Website pages</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            Edit every page section as blocks. Publish a core page to activate the edited version;
            keep it Draft to use the original designed fallback.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-ghost" type="button" onClick={addPage}>Add page</button>
          <button className="btn btn-ghost" type="button" onClick={deletePage} disabled={!selected || selected.managed}>Delete selected</button>
          {selected ? (
            <Link href={selected.slug === "home" ? "/" : `/${selected.slug}`} className="btn btn-ghost" target="_blank">View live</Link>
          ) : null}
          <button className="btn btn-ghost" disabled={status === "saving"} onClick={() => void save()}>
            Save draft
          </button>
          <button className="btn btn-primary" disabled={status === "saving" || !selected} onClick={() => void save({ publishSelected: true })}>
            {status === "saving" ? "Saving..." : "Save & publish"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : status === "saved" ? (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Website pages and navigation saved.</p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Global theme</p>
            <p className="mt-2 text-sm text-white/65">
              Controls public site colors and font stacks across all pages.
            </p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => void saveTheme()}>
            Save theme
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ["background", "Background"],
            ["backgroundMuted", "Top background"],
            ["surface", "Surface"],
            ["text", "Text"],
            ["textMuted", "Muted text"],
            ["accent", "Accent"],
          ].map(([key, label]) => (
            <label key={key} className="block text-xs uppercase tracking-[0.2em] text-white/55">
              {label}
              <input
                value={theme[key as keyof SiteTheme] as string}
                onChange={(event) => updateTheme({ [key]: event.target.value } as Partial<SiteTheme>)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
              />
            </label>
          ))}
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
            Body font
            <select
              value={theme.bodyFont}
              onChange={(event) => updateTheme({ bodyFont: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
            Display font
            <select
              value={theme.displayFont}
              onChange={(event) => updateTheme({ displayFont: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr_1fr]">
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={theme.backgroundMediaEnabled}
              onChange={(event) => updateTheme({ backgroundMediaEnabled: event.target.checked })}
            />
            Continue image/video background
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
            Site background image/video URL
            <input
              value={theme.backgroundMediaUrl}
              onChange={(event) => updateTheme({ backgroundMediaUrl: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target({ kind: "themeBackgroundMedia" })}>
              Choose from R2
            </button>
            <input
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadThemeMedia(file, "backgroundMediaUrl");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <label className="block text-xs uppercase tracking-[0.2em] text-white/55">
            Site background poster URL
            <input
              value={theme.backgroundPosterUrl}
              onChange={(event) => updateTheme({ backgroundPosterUrl: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
            />
            <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target({ kind: "themeBackgroundPoster" })}>
              Choose from R2
            </button>
            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-xs text-white/55"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadThemeMedia(file, "backgroundPosterUrl");
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Navigation</p>
            <p className="mt-2 text-sm text-white/65">
              Turn public nav items on/off and rename them. Blog is ready but hidden until launch.
            </p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={() => void saveNav()}>
            Save nav
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-white/55">
                Auto Work pillar links (preview)
              </p>
              <p className="mt-1 text-xs text-white/60">
                These links appear in the site header after your Work link. Toggle them under{" "}
                <Link href="/admin/work-pillars" className="underline text-white/80 hover:text-white">
                  Work pillars
                </Link>
                .
              </p>
            </div>
          </div>

          {!workHubVisible ? (
            <p className="mt-3 text-xs text-amber-200/80">
              Work is hidden in navigation, so pillar links will not be injected.
            </p>
          ) : autoPillarLinks.length === 0 ? (
            <p className="mt-3 text-xs text-white/55">
              No visible pillars (or pillars not loaded yet). If this is unexpected, check Work pillars.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {autoPillarLinks.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/85">{item.label}</p>
                    <p className="truncate font-mono text-[0.7rem] text-white/50">{item.href}</p>
                  </div>
                  <span className="text-[0.65rem] uppercase tracking-[0.2em] text-white/40">Auto</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {nav.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[90px_1fr_1fr_90px_120px] md:items-center">
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(event) => updateNavItem(item.id, { visible: event.target.checked })}
                />
                Show
              </label>
              <input
                value={item.label}
                onChange={(event) => updateNavItem(item.id, { label: event.target.value })}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                aria-label={`${item.id} label`}
              />
              <input
                value={item.href}
                onChange={(event) => updateNavItem(item.id, { href: event.target.value })}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white"
                aria-label={`${item.id} URL`}
              />
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                <input
                  type="checkbox"
                  checked={Boolean(item.cta)}
                  onChange={(event) => updateNavItem(item.id, { cta: event.target.checked })}
                />
                CTA
              </label>
              <div className="flex gap-2 text-xs text-white/60">
                <button type="button" className="underline disabled:opacity-30" onClick={() => moveNavItem(item.id, -1)} disabled={index === 0}>Up</button>
                <button type="button" className="underline disabled:opacity-30" onClick={() => moveNavItem(item.id, 1)} disabled={index === nav.length - 1}>Down</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[260px_300px_1fr]">
        <aside className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => {
                setSelectedId(page.id);
                setSelectedBlockId(page.blocks[0]?.id ?? "");
              }}
              className={`block w-full rounded-2xl border px-4 py-3 text-left ${
                page.id === selected?.id
                  ? "border-white/40 bg-white text-black"
                  : "border-white/10 bg-white/5 text-white/75 hover:border-white/30"
              }`}
            >
              <span className="block text-sm font-medium">{page.title}</span>
              <span className="mt-1 block text-xs opacity-65">
                {page.slug === "home" ? "/" : `/${page.slug}`} · {page.status}
                {page.managed ? " · core" : ""}
              </span>
            </button>
          ))}
        </aside>

        {selected ? (
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="grid gap-3">
              <label className="text-xs uppercase tracking-[0.25em] text-white/50">Page status</label>
              <select
                value={selected.status}
                onChange={(event) => updateSelected({ status: event.target.value === "PUBLISHED" ? "PUBLISHED" : "DRAFT" })}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              >
                <option value="DRAFT">Draft fallback</option>
                <option value="PUBLISHED">Published override</option>
              </select>
              <label className="text-xs uppercase tracking-[0.25em] text-white/50">Title</label>
              <input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
              <label className="text-xs uppercase tracking-[0.25em] text-white/50">Slug</label>
              <input value={selected.slug} disabled={selected.managed} onChange={(event) => updateSelected({ slug: slugify(event.target.value) })} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white disabled:opacity-50" />
            </div>

            <div className="mt-6 flex items-center gap-2">
              <select value={newBlockType} onChange={(event) => setNewBlockType(event.target.value as WebsiteBlockType)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                {BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BLOCK_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
              <button className="btn btn-ghost" type="button" onClick={addBlock}>Add block</button>
            </div>

            <div className="mt-4 space-y-2">
              {selected.blocks.map((block, index) => (
                <div key={block.id} className={`rounded-xl border p-3 ${block.id === selectedBlock?.id ? "border-white/40 bg-white text-black" : "border-white/10 bg-black/20 text-white/75"}`}>
                  <button type="button" onClick={() => setSelectedBlockId(block.id)} className="block w-full text-left">
                    <span className="block text-sm font-medium">{block.label || block.title || block.type}</span>
                    <span className="text-xs opacity-60">{block.type}</span>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="text-xs underline" onClick={() => moveBlock(block.id, -1)} disabled={index === 0}>Up</button>
                    <button type="button" className="text-xs underline" onClick={() => moveBlock(block.id, 1)} disabled={index === selected.blocks.length - 1}>Down</button>
                    <button type="button" className="text-xs underline" onClick={() => deleteBlock(block.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : null}

        {selectedBlock ? (
          <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-white/70">
                Block label
                <input value={selectedBlock.label} onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                Block type
                <select value={selectedBlock.type} onChange={(event) => updateBlock(selectedBlock.id, { type: event.target.value as WebsiteBlockType })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                  {BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {BLOCK_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm text-white/70">
              Eyebrow
              <input value={selectedBlock.eyebrow} onChange={(event) => updateBlock(selectedBlock.id, { eyebrow: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
            </label>
            <label className="block text-sm text-white/70">
              Title
              <input value={selectedBlock.title} onChange={(event) => updateBlock(selectedBlock.id, { title: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
            </label>
            <label className="block text-sm text-white/70">
              Body / intro copy
              <textarea value={selectedBlock.body} onChange={(event) => updateBlock(selectedBlock.id, { body: event.target.value })} rows={6} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-white/70">
                {selectedBlock.type === "gallery"
                  ? "Full-page background (image or video URL)"
                  : "Background video or image URL"}
                <input value={selectedBlock.mediaUrl} onChange={(event) => updateBlock(selectedBlock.id, { mediaUrl: event.target.value })} placeholder="/hero-loop.mp4 or https://..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
                <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target({ kind: "blockMedia", blockId: selectedBlock.id })}>
                  Choose from R2
                </button>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
                  className="mt-2 block w-full text-xs text-white/55"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBlockMedia(selectedBlock.id, file, "mediaUrl");
                    event.currentTarget.value = "";
                  }}
                />
                {selectedBlock.type === "gallery" ? (
                  <p className="mt-2 text-xs leading-relaxed text-white/45">
                    This media drives the backdrop on /galleries before visitors enter a code. Use poster for video first frame on slow connections.
                  </p>
                ) : null}
              </label>
              <label className="block text-sm text-white/70">
                {selectedBlock.type === "gallery" ? "Video poster (still image, optional)" : "Poster image URL"}
                <input value={selectedBlock.posterUrl} onChange={(event) => updateBlock(selectedBlock.id, { posterUrl: event.target.value })} placeholder="/hero-poster.jpg" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
                <button type="button" className="mt-2 text-xs uppercase tracking-[0.2em] text-white/55 underline" onClick={() => setR2Target({ kind: "blockPoster", blockId: selectedBlock.id })}>
                  Choose from R2
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-xs text-white/55"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadBlockMedia(selectedBlock.id, file, "posterUrl");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-white/70">
                CTA label
                <input value={selectedBlock.ctaLabel} onChange={(event) => updateBlock(selectedBlock.id, { ctaLabel: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
              </label>
              <label className="block text-sm text-white/70">
                CTA URL
                <input value={selectedBlock.ctaHref} onChange={(event) => updateBlock(selectedBlock.id, { ctaHref: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" />
              </label>
            </div>
            {selectedBlock.type === "stats" || selectedBlock.type === "cards" || selectedBlock.type === "list" ? (
              <label className="block text-sm text-white/70">
                Items, one per line as <code>title | body | meta | media URL</code>
                <textarea value={itemsToLines(selectedBlock.items)} onChange={(event) => updateBlock(selectedBlock.id, { items: linesToItems(event.target.value) })} rows={8} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white" />
              </label>
            ) : null}
            {selectedBlock.type === "hero" || selectedBlock.type === "cards" || selectedBlock.type === "list" ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setR2Target({ kind: "itemMedia", blockId: selectedBlock.id })}
              >
                Add R2 media as items
              </button>
            ) : null}
            {selectedBlock.type === "hero" || selectedBlock.type === "cards" || selectedBlock.type === "list" ? (
              <label className="block">
                <span className="btn btn-ghost inline-flex cursor-pointer">Upload media as items</span>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void uploadItemMedia(selectedBlock.id, event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
          </section>
        ) : selected ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            Add a block to edit this page.
          </section>
        ) : null}
      </div>
    </div>
  );
}
