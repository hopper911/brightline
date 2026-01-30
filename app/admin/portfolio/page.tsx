"use client";

import { useMemo, useState } from "react";

type UploadUrlResponse = { url: string; publicUrl?: string; key?: string } | { error: string };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminPortfolioPage() {
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState("commercial");
  const [file, setFile] = useState<File | null>(null);
  const [externalGalleryUrl, setExternalGalleryUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  const safeSlug = useMemo(() => slugify(title || "untitled"), [title]);

  async function handleUpload() {
    setMessage("");
    setStatus("uploading");

    try {
      if (!file) throw new Error("Choose an image file first.");
      if (!title.trim()) throw new Error("Enter a project title first.");

      const res = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          categorySlug,
          projectSlug: safeSlug,
        }),
      });

      const data: UploadUrlResponse = await res.json();

      if (!res.ok) {
        const msg =
          "error" in data ? data.error : `Upload URL failed (${res.status})`;
        throw new Error(msg);
      }

      if (!("url" in data)) {
        throw new Error("Server did not return an upload URL.");
      }

      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!put.ok) {
        throw new Error(`Upload failed (${put.status}).`);
      }

      setStatus("done");
      const coverUrl = "publicUrl" in data && data.publicUrl ? data.publicUrl : "";
      if (!coverUrl) {
        throw new Error("Public URL missing from upload response.");
      }

      if (externalGalleryUrl.trim()) {
        await fetch("/api/admin/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug: safeSlug,
            category: categorySlug.replace(/-/g, " "),
            categorySlug,
            coverUrl,
            externalGalleryUrl: externalGalleryUrl.trim(),
            published: true,
            images: [],
          }),
        });
      }
      setMessage("Upload complete. Portfolio metadata saved.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="section-title">Admin · Portfolio</h1>
      <p className="section-subtitle">
        Upload new portfolio images and manage projects.
      </p>
      <div className="mt-4">
        <a href="/admin/clients" className="btn btn-ghost">
          Manage client access
        </a>
        <a href="/admin/leads" className="btn btn-ghost">
          Leads
        </a>
        <a href="/admin/projects" className="btn btn-ghost">
          Projects
        </a>
        <a href="/admin/tags" className="btn btn-ghost">
          Tags
        </a>
        <a href="/admin/testimonials" className="btn btn-ghost">
          Testimonials
        </a>
        <a href="/admin/galleries" className="btn btn-ghost">
          Galleries
        </a>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-black/60">
              Project title
            </span>
            <input
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Hudson Yards Penthouse"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-black/60">
              Category
            </span>
            <select
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
            >
              <option value="commercial">Commercial</option>
              <option value="hospitality">Hospitality</option>
              <option value="fashion">Fashion</option>
              <option value="food">Food</option>
              <option value="graphic-design">Graphic Design</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-black/60">
              Adobe Gallery URL (public)
            </span>
            <input
              className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
              value={externalGalleryUrl}
              onChange={(e) => setExternalGalleryUrl(e.target.value)}
              placeholder="https://lightroom.adobe.com/..."
            />
          </label>

          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-black/60">
              Project slug (auto)
            </span>
            <div className="rounded-xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm">
              {safeSlug}
            </div>
          </div>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-black/60">
              Image file
            </span>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-black/50">
              Tip: Start with 1 image to confirm upload works, then expand.
            </p>
          </label>

          <button
            onClick={handleUpload}
            disabled={status === "uploading"}
            className="btn btn-primary"
          >
            {status === "uploading" ? "Uploading..." : "Upload"}
          </button>

          {message ? (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                status === "error"
                  ? "border border-red-500/20 bg-red-500/10"
                  : "border border-black/10 bg-black/[0.03]"
              }`}
            >
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
