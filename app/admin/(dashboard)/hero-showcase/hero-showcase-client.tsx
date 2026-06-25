"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { WebsiteBlock, WebsiteBlockItem, WebsitePage } from "@/lib/website-pages";
import { getPublicR2Url } from "@/lib/r2";
import R2BrowserModal from "../work/R2BrowserModal";

const MAX_SHOWCASE_ITEMS = 3;

type R2Target = { blockId: string; itemIndex: number } | null;

function pagePath(slug: string) {
  return slug === "home" ? "/" : `/${slug}`;
}

function getHeroBlock(page: WebsitePage): WebsiteBlock | undefined {
  return page.blocks.find((block) => block.type === "hero");
}

async function uploadSiteMedia(file: File) {
  const res = await fetch("/api/admin/site-media/upload-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      folder: "pages",
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

function blankShowcaseItem(index: number): WebsiteBlockItem {
  return {
    title: `Recent project ${index + 1}`,
    body: "Update this caption.",
    meta: `Recent ${String(index + 1).padStart(2, "0")}`,
  };
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function cardKey(blockId: string, index: number) {
  return `${blockId}:${index}`;
}

export default function HeroShowcaseClient({ initialPages }: { initialPages: WebsitePage[] }) {
  const heroPages = useMemo(
    () => initialPages.filter((page) => getHeroBlock(page)),
    [initialPages]
  );

  const [pages, setPages] = useState<WebsitePage[]>(initialPages);
  const [selectedSlug, setSelectedSlug] = useState(heroPages[0]?.slug ?? "home");
  const [r2Target, setR2Target] = useState<R2Target>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [captionLoadingByCard, setCaptionLoadingByCard] = useState<Record<string, boolean>>({});
  const [captionErrorByCard, setCaptionErrorByCard] = useState<Record<string, string>>({});

  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedSlug) ?? heroPages[0],
    [pages, selectedSlug, heroPages]
  );
  const heroBlock = selectedPage ? getHeroBlock(selectedPage) : undefined;

  function updateHeroBlock(blockId: string, patch: Partial<WebsiteBlock>) {
    if (!selectedPage) return;
    setPages((current) =>
      current.map((page) =>
        page.slug !== selectedPage.slug
          ? page
          : {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === blockId ? { ...block, ...patch } : block
              ),
            }
      )
    );
    setStatus("idle");
  }

  function updateItem(blockId: string, itemIndex: number, patch: Partial<WebsiteBlockItem>) {
    if (!heroBlock) return;
    const items = [...heroBlock.items];
    items[itemIndex] = { ...items[itemIndex], ...patch };
    updateHeroBlock(blockId, { items });
  }

  function removeItem(blockId: string, itemIndex: number) {
    if (!heroBlock) return;
    updateHeroBlock(blockId, {
      items: heroBlock.items.filter((_, index) => index !== itemIndex),
    });
  }

  function moveItem(blockId: string, itemIndex: number, direction: -1 | 1) {
    if (!heroBlock) return;
    const swapIndex = itemIndex + direction;
    if (swapIndex < 0 || swapIndex >= heroBlock.items.length) return;
    const items = [...heroBlock.items];
    [items[itemIndex], items[swapIndex]] = [items[swapIndex]!, items[itemIndex]!];
    updateHeroBlock(blockId, { items });
  }

  function addItem(blockId: string) {
    if (!heroBlock || heroBlock.items.length >= MAX_SHOWCASE_ITEMS) return;
    updateHeroBlock(blockId, {
      items: [...heroBlock.items, blankShowcaseItem(heroBlock.items.length)],
    });
  }

  async function useR2Keys(keys: string[]) {
    if (!r2Target || !heroBlock) return;
    const url = keys.map(getPublicR2Url).filter(Boolean)[0];
    if (!url) return;
    updateItem(heroBlock.id, r2Target.itemIndex, { mediaUrl: url });
    setR2Target(null);
  }

  async function uploadItemMedia(blockId: string, itemIndex: number, file: File) {
    setStatus("saving");
    setError("");
    try {
      const publicUrl = await uploadSiteMedia(file);
      updateItem(blockId, itemIndex, { mediaUrl: publicUrl });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("error");
    }
  }

  async function generateCaption(itemIndex: number, options: { replace?: boolean } = {}) {
    if (!heroBlock || !selectedPage) return;
    const item = heroBlock.items[itemIndex];
    if (!item) return;

    const mediaUrl = item.mediaUrl?.trim();
    if (!mediaUrl) {
      setCaptionErrorByCard((current) => ({
        ...current,
        [cardKey(heroBlock.id, itemIndex)]: "Add an image before generating a caption.",
      }));
      return;
    }
    if (isVideoUrl(mediaUrl)) {
      setCaptionErrorByCard((current) => ({
        ...current,
        [cardKey(heroBlock.id, itemIndex)]: "AI captions work for images only.",
      }));
      return;
    }
    if (item.body.trim() && item.body !== "Update this caption." && !options.replace) {
      const ok = window.confirm("Replace the existing caption with AI-generated text?");
      if (!ok) return;
    }

    const key = cardKey(heroBlock.id, itemIndex);
    setCaptionLoadingByCard((current) => ({ ...current, [key]: true }));
    setCaptionErrorByCard((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    try {
      const res = await fetch("/api/admin/hero-showcase/generate-caption", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: mediaUrl,
          context: {
            pageTitle: selectedPage.title,
            cardTitle: item.title,
            cardLabel: item.meta,
          },
        }),
      });
      const data = (await res.json()) as { ok?: boolean; caption?: string; error?: string };
      if (!res.ok || !data.caption) {
        throw new Error(data.error ?? "Failed to generate caption.");
      }
      updateItem(heroBlock.id, itemIndex, { body: data.caption });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate caption.";
      setCaptionErrorByCard((current) => ({ ...current, [key]: message }));
    } finally {
      setCaptionLoadingByCard((current) => ({ ...current, [key]: false }));
    }
  }

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/admin/website-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pages }),
      });
      const json = (await res.json()) as { ok?: boolean; pages?: WebsitePage[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      setPages(json.pages ?? pages);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setStatus("error");
    }
  }

  if (!selectedPage || !heroBlock) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-white/70">
        No hero pages found. Add a hero block under{" "}
        <Link href="/admin/pages" className="underline text-white">
          Website pages
        </Link>
        .
      </div>
    );
  }

  const showcaseOn = heroBlock.showcaseEnabled !== false;

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <R2BrowserModal
        isOpen={r2Target !== null}
        onClose={() => setR2Target(null)}
        onAddKeys={useR2Keys}
        mode="single"
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Public site</p>
          <h1 className="mt-2 font-display text-4xl text-white">Hero showcase</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Edit the large image cards beside the hero headline on Home, About, and other CMS pages.
            The page must be set to <strong className="text-white/90">Published override</strong> under{" "}
            <Link href="/admin/pages" className="underline text-white/85 hover:text-white">
              Website pages
            </Link>{" "}
            for changes to appear live.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={pagePath(selectedPage.slug)}
            className="btn btn-ghost"
            target="_blank"
          >
            View live
          </Link>
          <button className="btn btn-primary" type="button" disabled={status === "saving"} onClick={() => void save()}>
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      {status === "saved" ? <p className="mt-4 text-sm text-emerald-300">Saved.</p> : null}

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {heroPages.map((page) => (
          <button
            key={page.slug}
            type="button"
            onClick={() => setSelectedSlug(page.slug)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              page.slug === selectedSlug
                ? "border-white bg-white text-black"
                : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
            }`}
          >
            {page.title}
            <span className="ml-2 opacity-60">{pagePath(page.slug)}</span>
          </button>
        ))}
        <Link href="/admin/pages" className="ml-auto self-center text-xs uppercase tracking-[0.2em] text-white/50 underline hover:text-white">
          All website pages →
        </Link>
      </div>

      {selectedPage.status !== "PUBLISHED" ? (
        <p className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          <strong>{selectedPage.title}</strong> is currently a draft fallback — visitors still see the
          built-in page design. Publish it under Website pages to use this showcase on the live site.
        </p>
      ) : null}

      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={showcaseOn}
            onChange={(event) =>
              updateHeroBlock(heroBlock.id, { showcaseEnabled: event.target.checked })
            }
            className="h-4 w-4"
          />
          <span>
            <strong className="text-white">Show hero image cards</strong>
            <span className="mt-0.5 block text-xs text-white/55">
              Turn off to hide the recent-project grid and show headline-only hero layout.
            </span>
          </span>
        </label>
      </section>

      {showcaseOn ? (
        <section className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Showcase cards</p>
              <p className="mt-1 text-sm text-white/60">
                Card 1 is the large featured image; cards 2–3 stack on the right (max {MAX_SHOWCASE_ITEMS}).
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={heroBlock.items.length >= MAX_SHOWCASE_ITEMS}
              onClick={() => addItem(heroBlock.id)}
            >
              Add card
            </button>
          </div>

          {heroBlock.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-8 text-center text-sm text-white/55">
              No cards yet. Add up to three images or videos from R2 or upload.
            </div>
          ) : null}

          {heroBlock.items.map((item, index) => (
            <article
              key={`${heroBlock.id}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                  {index === 0 ? "Featured card" : `Secondary card ${index}`}
                </p>
                <div className="flex gap-2 text-xs text-white/60">
                  <button
                    type="button"
                    className="underline disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveItem(heroBlock.id, index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="underline disabled:opacity-30"
                    disabled={index === heroBlock.items.length - 1}
                    onClick={() => moveItem(heroBlock.id, index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="underline text-red-300/80 hover:text-red-200"
                    onClick={() => removeItem(heroBlock.id, index)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {item.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrl}
                      alt={item.title || "Preview"}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-white/5 px-3 text-center text-xs text-white/40">
                      No image — choose from R2 or upload
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-white/70">
                    Label (e.g. Recent 01)
                    <input
                      value={item.meta ?? ""}
                      onChange={(event) =>
                        updateItem(heroBlock.id, index, { meta: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block text-sm text-white/70">
                    Title
                    <input
                      value={item.title}
                      onChange={(event) =>
                        updateItem(heroBlock.id, index, { title: event.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="block text-sm text-white/70 sm:col-span-2">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      Caption
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.18em] text-white/55 underline hover:text-white disabled:opacity-40"
                        disabled={
                          !item.mediaUrl ||
                          isVideoUrl(item.mediaUrl) ||
                          captionLoadingByCard[cardKey(heroBlock.id, index)]
                        }
                        onClick={() => void generateCaption(index)}
                      >
                        {captionLoadingByCard[cardKey(heroBlock.id, index)]
                          ? "Generating…"
                          : "Generate with AI"}
                      </button>
                    </span>
                    <textarea
                      value={item.body}
                      onChange={(event) =>
                        updateItem(heroBlock.id, index, { body: event.target.value })
                      }
                      rows={2}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                    />
                    {captionErrorByCard[cardKey(heroBlock.id, index)] ? (
                      <p className="mt-2 text-xs text-red-300">
                        {captionErrorByCard[cardKey(heroBlock.id, index)]}
                      </p>
                    ) : null}
                  </label>
                  <label className="block text-sm text-white/70 sm:col-span-2">
                    Media URL
                    <input
                      value={item.mediaUrl ?? ""}
                      onChange={(event) =>
                        updateItem(heroBlock.id, index, { mediaUrl: event.target.value })
                      }
                      placeholder="https://… or /images/…"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => setR2Target({ blockId: heroBlock.id, itemIndex: index })}
                    >
                      Choose from R2
                    </button>
                    <label className="btn btn-ghost cursor-pointer text-xs">
                      Upload image
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.m4v"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadItemMedia(heroBlock.id, index, file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
