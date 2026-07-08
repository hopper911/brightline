"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BlogPost, BlogPostStatus, BlogGalleryImage } from "@/lib/blog-posts";
import { blankBlogPost, formatBlogDate } from "@/lib/blog-posts";
import type { BlogSuggestResult } from "@/lib/ai/generateBlogPostAssist";
import { getPublicR2Url } from "@/lib/r2";
import R2BrowserModal from "../work/R2BrowserModal";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function tagsToString(tags: string[]) {
  return tags.join(", ");
}

function tagsFromString(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function statusBadge(status: BlogPostStatus) {
  return status === "PUBLISHED"
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
    : "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export default function BlogAdminClient({ initialPosts }: { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [selectedId, setSelectedId] = useState(initialPosts[0]?.id ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState("");
  const [suggestions, setSuggestions] = useState<BlogSuggestResult | null>(null);
  const [r2Target, setR2Target] = useState<"cover" | "gallery" | null>(null);

  const selected = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? posts[0],
    [posts, selectedId]
  );

  const draftCount = posts.filter((p) => p.status === "DRAFT").length;
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED").length;

  function setDirty() {
    setSaveStatus("idle");
  }

  function updateSelected(patch: Partial<BlogPost>) {
    if (!selected) return;
    setPosts((current) =>
      current.map((post) =>
        post.id === selected.id
          ? {
              ...post,
              ...patch,
              updatedAt: new Date().toISOString(),
              ...(patch.title && !patch.slug ? { slug: slugify(patch.title) || post.slug } : {}),
            }
          : post
      )
    );
    setDirty();
  }

  function addPost() {
    const post = blankBlogPost("New blog post");
    setPosts((current) => [post, ...current]);
    setSelectedId(post.id);
    setSuggestions(null);
    setDirty();
  }

  function deletePost() {
    if (!selected) return;
    if (!confirm(`Delete "${selected.title}"? This cannot be undone until you save.`)) return;
    const next = posts.filter((post) => post.id !== selected.id);
    setPosts(next);
    setSelectedId(next[0]?.id ?? "");
    setSuggestions(null);
    setDirty();
  }

  function setStatus(nextStatus: BlogPostStatus) {
    if (!selected) return;
    updateSelected({
      status: nextStatus,
      publishedAt:
        nextStatus === "PUBLISHED"
          ? selected.publishedAt ?? new Date().toISOString()
          : selected.publishedAt,
    });
  }

  async function save() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/blog-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ posts }),
      });
      const json = (await res.json()) as { ok?: boolean; posts?: BlogPost[]; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Save failed.");
      setPosts(json.posts ?? posts);
      setSaveStatus("saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
      setSaveStatus("error");
    }
  }

  async function runAssist(
    action: "suggest" | "polish" | "fix" | "excerpt" | "seo",
    options?: { replaceBody?: boolean }
  ) {
    if (!selected) return;
    if ((action === "polish" || action === "fix") && selected.body.trim()) {
      const label = action === "polish" ? "polish" : "correct";
      if (!options?.replaceBody && !window.confirm(`Replace your draft body with the AI-${label}ed version?`)) {
        return;
      }
    }

    setAiLoading(action);
    setAiError("");
    if (action !== "suggest") setSuggestions(null);

    try {
      const res = await fetch("/api/admin/blog-posts/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          draft: {
            title: selected.title,
            excerpt: selected.excerpt,
            body: selected.body,
            tags: selected.tags,
            seoTitle: selected.seoTitle,
            seoDescription: selected.seoDescription,
          },
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        result?: BlogSuggestResult & { body?: string; excerpt?: string; seoTitle?: string; seoDescription?: string };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.result) {
        throw new Error(json.error ?? "AI assist failed.");
      }

      const result = json.result;
      if (action === "suggest") {
        setSuggestions(result as BlogSuggestResult);
      } else if (action === "polish" || action === "fix") {
        if (result.body) updateSelected({ body: result.body });
      } else if (action === "excerpt") {
        if (result.excerpt) updateSelected({ excerpt: result.excerpt });
      } else if (action === "seo") {
        updateSelected({
          ...(result.seoTitle ? { seoTitle: result.seoTitle } : {}),
          ...(result.seoDescription ? { seoDescription: result.seoDescription } : {}),
        });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI assist failed.");
    } finally {
      setAiLoading(null);
    }
  }

  function applySuggestion(patch: Partial<BlogPost>) {
    updateSelected(patch);
  }

  function useR2Keys(keys: string[]) {
    if (!selected) return;
    const urls = keys.map(getPublicR2Url).filter(Boolean);
    if (urls.length === 0) return;

    if (r2Target === "gallery") {
      const nextImages: BlogGalleryImage[] = urls.map((url, index) => ({
        url,
        alt: `${selected.title} image ${selected.galleryImages.length + index + 1}`,
      }));
      updateSelected({ galleryImages: [...selected.galleryImages, ...nextImages] });
      setR2Target(null);
      return;
    }

    updateSelected({ coverImageUrl: urls[0] ?? "" });
    setR2Target(null);
  }

  function updateGalleryImage(index: number, patch: Partial<BlogGalleryImage>) {
    if (!selected) return;
    const next = selected.galleryImages.map((image, i) =>
      i === index ? { ...image, ...patch } : image
    );
    updateSelected({ galleryImages: next });
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    if (!selected) return;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= selected.galleryImages.length) return;
    const next = [...selected.galleryImages];
    [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
    updateSelected({ galleryImages: next });
  }

  function removeGalleryImage(index: number) {
    if (!selected) return;
    updateSelected({
      galleryImages: selected.galleryImages.filter((_, i) => i !== index),
    });
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/70">
        <p className="font-display text-3xl text-white">Your journal starts here</p>
        <p className="mt-3 text-sm">Create your first blog post — it stays private as a draft until you publish.</p>
        <button type="button" className="btn btn-primary mt-8" onClick={addPost}>
          New blog post
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <R2BrowserModal
        isOpen={r2Target !== null}
        onClose={() => setR2Target(null)}
        onAddKeys={useR2Keys}
        mode={r2Target === "gallery" ? "multiple" : "single"}
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Journal</p>
          <h1 className="mt-2 font-display text-4xl text-white">Blog</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Write posts in draft, refine with AI, and publish when you are ready. Drafts never appear on the public site.
            Turn on the Blog link under Website pages → Navigation when you want to go live.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selected.status === "PUBLISHED" ? (
            <Link href={`/blog/${selected.slug}`} className="btn btn-ghost" target="_blank">
              View live
            </Link>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={addPost}>
            New post
          </button>
          <button type="button" className="btn btn-primary" disabled={saveStatus === "saving"} onClick={() => void save()}>
            {saveStatus === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-white/55">
        <span className="rounded-full border border-white/10 px-3 py-1">{posts.length} posts</span>
        <span className="rounded-full border border-amber-400/20 px-3 py-1 text-amber-100">{draftCount} drafts</span>
        <span className="rounded-full border border-emerald-400/20 px-3 py-1 text-emerald-200">{publishedCount} live</span>
      </div>

      {saveError ? <p className="mt-4 text-sm text-red-300">{saveError}</p> : null}
      {saveStatus === "saved" ? <p className="mt-4 text-sm text-emerald-300">Saved.</p> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {posts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => {
                setSelectedId(post.id);
                setSuggestions(null);
                setAiError("");
              }}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                post.id === selected.id
                  ? "border-white/40 bg-white text-black"
                  : "border-white/10 bg-white/5 text-white/75 hover:border-white/30"
              }`}
            >
              <span className="block text-sm font-medium line-clamp-2">{post.title || "Untitled"}</span>
              <span className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
                <span className={`rounded-full border px-2 py-0.5 ${statusBadge(post.status)}`}>{post.status}</span>
                <span>{formatBlogDate(post.updatedAt)}</span>
              </span>
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Visibility</p>
                <p className="mt-1 text-sm text-white/65">
                  {selected.status === "DRAFT"
                    ? "Only you can see this post. Publish when it is ready for brightlinephotography.com/blog."
                    : "This post is live on the public blog."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn text-xs ${selected.status === "DRAFT" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setStatus("DRAFT")}
                >
                  Draft
                </button>
                <button
                  type="button"
                  className={`btn text-xs ${selected.status === "PUBLISHED" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setStatus("PUBLISHED")}
                >
                  Publish
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-white/70 sm:col-span-2">
                Title
                <input
                  value={selected.title}
                  onChange={(event) => updateSelected({ title: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>
              <label className="block text-sm text-white/70">
                URL slug
                <input
                  value={selected.slug}
                  onChange={(event) => updateSelected({ slug: slugify(event.target.value) })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white"
                />
              </label>
              <label className="block text-sm text-white/70">
                Author
                <input
                  value={selected.author}
                  onChange={(event) => updateSelected({ author: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>
              <label className="block text-sm text-white/70 sm:col-span-2">
                Excerpt
                <textarea
                  value={selected.excerpt}
                  onChange={(event) => updateSelected({ excerpt: event.target.value })}
                  rows={2}
                  placeholder="Short summary for the blog index card"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>
            </div>

            <label className="block text-sm text-white/70">
              Body
              <textarea
                value={selected.body}
                onChange={(event) => updateSelected({ body: event.target.value })}
                rows={14}
                placeholder="Write your post. Use blank lines between paragraphs."
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white"
              />
            </label>

            <label className="block text-sm text-white/70">
              Tags
              <input
                value={tagsToString(selected.tags)}
                onChange={(event) => updateSelected({ tags: tagsFromString(event.target.value) })}
                placeholder="production, architecture, delivery"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-white/70">
                Cover image URL
                <input
                  value={selected.coverImageUrl}
                  onChange={(event) => updateSelected({ coverImageUrl: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white"
                />
                <button type="button" className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55 underline" onClick={() => setR2Target("cover")}>
                  Choose from R2
                </button>
              </label>
              <label className="block text-sm text-white/70">
                Cover image alt
                <input
                  value={selected.coverImageAlt}
                  onChange={(event) => updateSelected({ coverImageAlt: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white/70">Gallery images</p>
                  <p className="mt-1 text-xs text-white/50">
                    Optional image grid below the body — ideal for photo sets and case-study visuals.
                  </p>
                </div>
                <button type="button" className="btn btn-ghost text-xs" onClick={() => setR2Target("gallery")}>
                  Add from R2
                </button>
              </div>
              {selected.galleryImages.length === 0 ? (
                <p className="mt-3 text-xs text-white/45">No gallery images yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selected.galleryImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 md:grid-cols-[72px_1fr_auto]"
                    >
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image.url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <input
                          value={image.url}
                          onChange={(event) => updateGalleryImage(index, { url: event.target.value })}
                          placeholder="Image URL"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                        />
                        <input
                          value={image.alt}
                          onChange={(event) => updateGalleryImage(index, { alt: event.target.value })}
                          placeholder="Alt text"
                          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-2 text-xs text-white/55">
                        <button type="button" className="underline disabled:opacity-30" disabled={index === 0} onClick={() => moveGalleryImage(index, -1)}>
                          Up
                        </button>
                        <button
                          type="button"
                          className="underline disabled:opacity-30"
                          disabled={index === selected.galleryImages.length - 1}
                          onClick={() => moveGalleryImage(index, 1)}
                        >
                          Down
                        </button>
                        <button type="button" className="text-red-300/80 underline hover:text-red-200" onClick={() => removeGalleryImage(index)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t border-white/10 pt-4">
              <label className="block text-sm text-white/70">
                SEO title
                <input
                  value={selected.seoTitle}
                  onChange={(event) => updateSelected({ seoTitle: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>
              <label className="block text-sm text-white/70">
                SEO description
                <input
                  value={selected.seoDescription}
                  onChange={(event) => updateSelected({ seoDescription: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-xs text-red-300/80 underline hover:text-red-200" onClick={deletePost}>
                Delete post
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">AI writing assistant</p>
            <p className="mt-2 text-sm text-white/65">
              Get suggestions, polish your draft, fix grammar, or generate excerpt and SEO fields. Review everything before publishing.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["suggest", "Suggest improvements"],
                  ["polish", "Polish writing"],
                  ["fix", "Fix grammar"],
                  ["excerpt", "Write excerpt"],
                  ["seo", "Generate SEO"],
                ] as const
              ).map(([action, label]) => (
                <button
                  key={action}
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={aiLoading !== null}
                  onClick={() => void runAssist(action)}
                >
                  {aiLoading === action ? "Working…" : label}
                </button>
              ))}
            </div>
            {aiError ? <p className="mt-3 text-sm text-red-300">{aiError}</p> : null}

            {suggestions ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Suggestions</p>
                {suggestions.suggestions.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
                    {suggestions.suggestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-white/55">No specific suggestions — your draft looks solid.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.improvedTitle ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ title: suggestions.improvedTitle })}>
                      Apply title
                    </button>
                  ) : null}
                  {suggestions.improvedExcerpt ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ excerpt: suggestions.improvedExcerpt })}>
                      Apply excerpt
                    </button>
                  ) : null}
                  {suggestions.improvedBody ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ body: suggestions.improvedBody })}>
                      Apply body
                    </button>
                  ) : null}
                  {suggestions.improvedSeoTitle ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ seoTitle: suggestions.improvedSeoTitle })}>
                      Apply SEO title
                    </button>
                  ) : null}
                  {suggestions.improvedSeoDescription ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-xs"
                      onClick={() => applySuggestion({ seoDescription: suggestions.improvedSeoDescription })}
                    >
                      Apply SEO description
                    </button>
                  ) : null}
                  {suggestions.suggestedTags?.length ? (
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => applySuggestion({ tags: suggestions.suggestedTags })}>
                      Apply tags
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
