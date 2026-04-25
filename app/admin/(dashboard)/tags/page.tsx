"use client";

import { useEffect, useMemo, useState } from "react";

type Tag = { id: string; name: string; slug: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminTagsPage() {
  const [name, setName] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  const slug = useMemo(() => slugify(name || "tag"), [name]);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/api/admin/tags");
      if (!res.ok || !active) return;
      const data = (await res.json()) as { tags: Tag[] };
      setTags(data.tags || []);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");

    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { tag: Tag };
      setTags((prev) => [data.tag, ...prev]);
      setName("");
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function deleteTag(id: string) {
    const res = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTags((prev) => prev.filter((tag) => tag.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="section-title">Admin · Tags</h1>
      <p className="section-subtitle">Manage project tags.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-4 rounded-2xl border border-black/10 bg-white/70 p-6"
      >
        <input
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
          placeholder="Tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm">
          Slug: {slug}
        </div>
        <button className="btn btn-primary" type="submit">
          {status === "saving" ? "Saving..." : "Create tag"}
        </button>
        {status === "error" ? (
          <p className="text-sm text-red-600">Could not save tag.</p>
        ) : null}
      </form>

      <div className="mt-10 space-y-3">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-3"
          >
            <div>
              <p className="text-sm text-black/80">{tag.name}</p>
              <p className="text-xs text-black/50">/{tag.slug}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => deleteTag(tag.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
