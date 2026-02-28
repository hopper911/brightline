"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type UploadUrlResponse = { url: string } | { error: string };

type PortfolioImage = {
  id: string;
  url: string;
  storageKey?: string | null;
  alt: string | null;
  sortOrder: number;
};

type PortfolioProject = {
  id: string;
  title: string;
  slug: string;
  category: string;
  categorySlug: string;
  location?: string | null;
  year?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  coverStorageKey?: string | null;
  coverAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  externalGalleryUrl?: string | null;
  published: boolean;
  images: PortfolioImage[];
};

const CATEGORY_OPTIONS = [
  { slug: "commercial-real-estate", label: "Commercial Real Estate" },
  { slug: "architecture", label: "Architecture" },
  { slug: "fashion", label: "Fashion" },
  { slug: "culinary", label: "Culinary" },
  { slug: "graphic-design", label: "Graphic Design" },
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sortImages(images: PortfolioImage[]) {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default function AdminPortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState(CATEGORY_OPTIONS[0]?.slug ?? "");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [externalGalleryUrl, setExternalGalleryUrl] = useState("");
  const [published, setPublished] = useState(true);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryUrlInput, setGalleryUrlInput] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverStorageKey, setCoverStorageKey] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<PortfolioImage[]>([]);

  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const safeSlug = useMemo(() => slugify(title || "untitled"), [title]);
  const isEditing = Boolean(selectedProjectId);
  const categoryLabel = useMemo(
    () =>
      CATEGORY_OPTIONS.find((option) => option.slug === categorySlug)?.label ??
      categorySlug,
    [categorySlug]
  );

  useEffect(() => {
    if (!isEditing) {
      setSlug(safeSlug);
    }
  }, [safeSlug, isEditing]);

  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects() {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/admin/portfolio");
      const raw = await res.text();
      let data: { ok?: boolean; projects?: PortfolioProject[]; error?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore parse error
      }
      if (!res.ok || !data?.projects) {
        throw new Error(
          data?.error ?? `Unable to load projects (${res.status}): ${raw.slice(0, 200)}`
        );
      }
      setProjects(data.projects);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load projects.");
      setStatus("error");
    } finally {
      setLoadingProjects(false);
    }
  }

  async function handleDelete(project: PortfolioProject) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeletingId(project.id);
    try {
      const res = await fetch(`/api/admin/portfolio/${project.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== project.id));
        if (selectedProjectId === project.id) {
          resetForm();
        }
      } else {
        const data = (await res.json()) as { error?: string };
        setMessage(data.error ?? "Failed to delete");
        setStatus("error");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to delete");
      setStatus("error");
    } finally {
      setDeletingId(null);
    }
  }

  function resetForm() {
    setSelectedProjectId(null);
    setTitle("");
    setSlug("");
    setCategorySlug(CATEGORY_OPTIONS[0]?.slug ?? "");
    setLocation("");
    setYear("");
    setDescription("");
    setCoverAlt("");
    setSeoTitle("");
    setSeoDescription("");
    setOgImageUrl("");
    setExternalGalleryUrl("");
    setPublished(true);
    setCoverFile(null);
    setGalleryFiles([]);
    setGalleryUrls([]);
    setGalleryUrlInput("");
    setCoverUrl("");
    setCoverStorageKey(null);
    setExistingImages([]);
  }

  function addGalleryUrl() {
    const trimmed = galleryUrlInput.trim();
    if (!trimmed) return;
    setGalleryUrls((prev) => [...prev, trimmed]);
    setGalleryUrlInput("");
  }

  function handleEdit(project: PortfolioProject) {
    setSelectedProjectId(project.id);
    setTitle(project.title);
    setSlug(project.slug);
    setCategorySlug(project.categorySlug);
    setLocation(project.location ?? "");
    setYear(project.year ?? "");
    setDescription(project.description ?? "");
    setCoverAlt(project.coverAlt ?? "");
    setSeoTitle(project.seoTitle ?? "");
    setSeoDescription(project.seoDescription ?? "");
    setOgImageUrl(project.ogImageUrl ?? "");
    setExternalGalleryUrl(project.externalGalleryUrl ?? "");
    setPublished(project.published);
    setCoverFile(null);
    setGalleryFiles([]);
    setCoverUrl(project.coverUrl ?? "");
    setCoverStorageKey(project.coverStorageKey ?? null);
    setExistingImages(sortImages(project.images ?? []));
  }

  function handleMoveImage(index: number, direction: number) {
    const next = [...existingImages];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    const resequenced = next.map((img, idx) => ({ ...img, sortOrder: idx }));
    setExistingImages(resequenced);
  }

  function handleAltChange(index: number, value: string) {
    setExistingImages((prev) =>
      prev.map((img, idx) => (idx === index ? { ...img, alt: value } : img))
    );
  }

  async function resolvePublicUrl(key: string) {
    const res = await fetch("/api/admin/public-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const raw = await res.text();
    let data: { url?: string; error?: string } | null = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // ignore parse error; we'll use raw in the error
    }
    if (!res.ok || !data?.url) {
      throw new Error(
        data?.error ?? `Unable to resolve public URL (${res.status}): ${raw.slice(0, 200)}`
      );
    }
    return data.url;
  }

  function extractStorageKey(signedUrl: string) {
    try {
      const url = new URL(signedUrl);
      const path = decodeURIComponent(url.pathname);
      const markers = ["/work/", "/portfolio-public/"];
      for (const marker of markers) {
        const idx = path.indexOf(marker);
        if (idx >= 0) return path.slice(idx + 1);
      }
      return path.replace(/^\//, "");
    } catch {
      return null;
    }
  }

  async function uploadFile(file: File, projectSlug: string) {
    const res = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        categorySlug,
        projectSlug,
      }),
    });

    const raw = await res.text();
    let data: UploadUrlResponse | null = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // ignore parse error; we'll use raw in the error
    }

    if (!res.ok) {
      const msg =
        (data && "error" in data ? data.error : null) ??
        `Upload URL failed (${res.status}): ${raw.slice(0, 200)}`;
      throw new Error(msg);
    }

    if (!data || !("url" in data) || !data.url) {
      throw new Error(`Server did not return an upload URL: ${raw.slice(0, 200)}`);
    }

    const put = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!put.ok) {
      const putText = await put.text();
      throw new Error(
        `Storage upload failed (${put.status}): ${putText.slice(0, 200) || put.statusText}`
      );
    }

    const storageKey = extractStorageKey(data.url);
    if (!storageKey) {
      throw new Error("Unable to determine storage key.");
    }

    const publicUrl = await resolvePublicUrl(storageKey);

    return { publicUrl, storageKey };
  }

  async function handleSubmit() {
    setMessage("");
    setStatus("uploading");

    try {
      if (!title.trim()) throw new Error("Enter a project title first.");
      const projectSlug = isEditing ? slug.trim() : safeSlug;
      if (!projectSlug) throw new Error("Enter a project slug.");

      let nextCoverUrl = coverUrl;
      let nextCoverStorageKey = coverStorageKey;
      if (coverFile) {
        const uploaded = await uploadFile(coverFile, projectSlug);
        nextCoverUrl = uploaded.publicUrl;
        nextCoverStorageKey = uploaded.storageKey;
        setCoverUrl(nextCoverUrl);
        setCoverStorageKey(nextCoverStorageKey);
      }

      if (!nextCoverUrl) {
        throw new Error("Upload a cover image or provide a cover URL.");
      }

      const uploadedGallery = await Promise.all(
        galleryFiles.map((file) => uploadFile(file, projectSlug))
      );

      const newImages = [
        ...uploadedGallery.map((image, index) => ({
          url: image.publicUrl,
          storageKey: image.storageKey,
          sortOrder: existingImages.length + index,
        })),
        ...galleryUrls.map((url, index) => ({
          url: url.trim(),
          sortOrder: existingImages.length + uploadedGallery.length + index,
        })),
      ];

      if (isEditing && selectedProjectId) {
        const res = await fetch("/api/admin/portfolio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedProjectId,
            title: title.trim(),
            slug: projectSlug,
            category: categoryLabel,
            categorySlug,
            location: location.trim() ? location.trim() : null,
            year: year.trim() ? year.trim() : null,
            description: description.trim() ? description.trim() : null,
            coverUrl: nextCoverUrl,
            coverStorageKey: nextCoverStorageKey,
            coverAlt: coverAlt.trim() ? coverAlt.trim() : null,
            seoTitle: seoTitle.trim() ? seoTitle.trim() : null,
            seoDescription: seoDescription.trim() ? seoDescription.trim() : null,
            ogImageUrl: ogImageUrl.trim() ? ogImageUrl.trim() : null,
            externalGalleryUrl: externalGalleryUrl.trim()
              ? externalGalleryUrl.trim()
              : null,
            published,
            images: existingImages.map((img, index) => ({
              id: img.id,
              alt: img.alt ?? null,
              sortOrder: typeof img.sortOrder === "number" ? img.sortOrder : index,
              storageKey: img.storageKey ?? null,
            })),
            newImages,
          }),
        });

        if (!res.ok) {
          const raw = await res.text();
          let errData: { error?: string } | null = null;
          try {
            errData = raw ? JSON.parse(raw) : null;
          } catch {
            /* ignore */
          }
          throw new Error(
            errData?.error ?? `Update failed (${res.status}): ${raw.slice(0, 200)}`
          );
        }
      } else {
        const res = await fetch("/api/admin/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            slug: projectSlug,
            category: categoryLabel,
            categorySlug,
            location: location.trim() ? location.trim() : null,
            year: year.trim() ? year.trim() : null,
            description: description.trim() ? description.trim() : null,
            coverUrl: nextCoverUrl,
            coverStorageKey: nextCoverStorageKey,
            coverAlt: coverAlt.trim() ? coverAlt.trim() : null,
            seoTitle: seoTitle.trim() ? seoTitle.trim() : null,
            seoDescription: seoDescription.trim() ? seoDescription.trim() : null,
            ogImageUrl: ogImageUrl.trim() ? ogImageUrl.trim() : null,
            externalGalleryUrl: externalGalleryUrl.trim()
              ? externalGalleryUrl.trim()
              : null,
            published,
            images: newImages,
          }),
        });

        if (!res.ok) {
          const raw = await res.text();
          let errData: { error?: string } | null = null;
          try {
            errData = raw ? JSON.parse(raw) : null;
          } catch {
            /* ignore */
          }
          throw new Error(
            errData?.error ?? `Create failed (${res.status}): ${raw.slice(0, 200)}`
          );
        }
      }

      setStatus("done");
      setMessage(isEditing ? "Project updated." : "Project created.");
      setGalleryFiles([]);
      setGalleryUrls([]);
      setGalleryUrlInput("");
      setCoverFile(null);
      await loadProjects();
      if (!isEditing) {
        resetForm();
      }
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Save failed.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="section-title">Admin · Portfolio</h1>
      <p className="section-subtitle">
        Upload new portfolio images and manage projects.
      </p>
      <div className="mt-4">
        <Link href="/admin/clients" className="btn btn-ghost">
          Manage client access
        </Link>
        <Link href="/admin/leads" className="btn btn-ghost">
          Leads
        </Link>
        <Link href="/admin/projects" className="btn btn-ghost">
          Projects
        </Link>
        <Link href="/admin/tags" className="btn btn-ghost">
          Tags
        </Link>
        <Link href="/admin/testimonials" className="btn btn-ghost">
          Testimonials
        </Link>
        <Link href="/admin/galleries" className="btn btn-ghost">
          Galleries
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {isEditing ? "Edit project" : "New project"}
          </h2>
          {isEditing ? (
            <button className="btn btn-ghost" onClick={resetForm}>
              Start new project
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-6">
          <section className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
              Identity
            </h3>
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
            {isEditing ? (
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                  Project slug
                </span>
                <input
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </label>
            ) : (
              <div className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                  Project slug (auto)
                </span>
                <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm">
                  {safeSlug}
                </div>
              </div>
            )}
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Category
              </span>
              <select
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
              Place & time
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                  Location
                </span>
                <input
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Miami, FL"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                  Year
                </span>
                <input
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g., 2025"
                />
              </label>
            </div>
          </section>

          <section className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
              Copy & links
            </h3>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Description
              </span>
              <textarea
                className="min-h-[110px] w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the project story and deliverables."
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                External gallery URL (optional)
              </span>
              <input
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                value={externalGalleryUrl}
                onChange={(e) => setExternalGalleryUrl(e.target.value)}
                placeholder="https://lightroom.adobe.com/..."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                  SEO title (optional)
                </span>
                <input
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                  OG image URL (optional)
                </span>
                <input
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                  value={ogImageUrl}
                  onChange={(e) => setOgImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                SEO description (optional)
              </span>
              <textarea
                className="min-h-[90px] w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
              />
            </label>
          </section>

          <section className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
              Cover image
            </h3>
            <p className="text-xs text-black/50">
              Paste a URL for zero-cost updates, or upload to replace.
            </p>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Cover image URL
              </span>
              <input
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://... or https://yoursite.com/images/..."
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Cover alt text (optional)
              </span>
              <input
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Replace cover image (upload)
              </span>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </section>

          <section className="grid gap-4 rounded-xl border border-black/10 bg-black/[0.02] p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
              Gallery
            </h3>
            <p className="text-xs text-black/50">
              Add images by URL (zero cost) or upload multiple files.
            </p>
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Add gallery image by URL
              </span>
              <div className="flex min-w-0 gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
                  value={galleryUrlInput}
                  onChange={(e) => setGalleryUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGalleryUrl())}
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="btn btn-ghost shrink-0"
                  onClick={addGalleryUrl}
                >
                  Add
                </button>
              </div>
            </label>
            {galleryUrls.length > 0 ? (
              <ul className="space-y-2">
                {galleryUrls.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-black/70">{url}</span>
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0 text-xs"
                      onClick={() =>
                        setGalleryUrls((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.25em] text-black/60">
                Gallery images (upload multiple)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full text-sm"
                onChange={(e) =>
                  setGalleryFiles(Array.from(e.target.files ?? []))
                }
              />
              <p className="text-xs text-black/50">
                {galleryFiles.length
                  ? `${galleryFiles.length} image(s) queued`
                  : "Add multiple images to build the gallery."}
              </p>
            </label>

            {existingImages.length ? (
              <div className="grid gap-3 rounded-xl border border-black/10 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-black/60">
                  Existing gallery images
                </div>
              {existingImages.map((img, index) => (
                <div
                  key={img.id}
                  className="grid gap-3 rounded-xl border border-black/10 bg-white p-3 md:grid-cols-[96px_1fr_auto]"
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? ""}
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                  <input
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs outline-none focus:border-black/30"
                    value={img.alt ?? ""}
                    onChange={(e) => handleAltChange(index, e.target.value)}
                    placeholder="Alt text"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => handleMoveImage(index, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => handleMoveImage(index, 1)}
                      disabled={index === existingImages.length - 1}
                    >
                      Down
                    </button>
                  </div>
                </div>
              ))}
              </div>
            ) : null}
          </section>

          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish immediately
          </label>

          <button
            onClick={handleSubmit}
            disabled={status === "uploading"}
            className="btn btn-primary"
          >
            {status === "uploading"
              ? "Saving..."
              : isEditing
              ? "Update project"
              : "Create project"}
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

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Existing projects</h2>
          {loadingProjects ? (
            <span className="text-xs text-black/50">Loading...</span>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold">{project.title}</div>
                <div className="text-xs text-black/50">
                  /work/{project.categorySlug}/{project.slug}
                </div>
                <div className="text-xs text-black/50">
                  {project.published ? "Published" : "Draft"} · {project.category}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleTogglePublish(project)}
                  disabled={togglingId === project.id}
                  className="btn btn-ghost text-xs disabled:opacity-50"
                >
                  {togglingId === project.id ? "…" : project.published ? "Unpublish" : "Publish"}
                </button>
                <div className="flex gap-1">
                <button
                  className="btn btn-ghost"
                  onClick={() => handleEdit(project)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(project)}
                  disabled={deletingId === project.id}
                  className="btn btn-ghost text-red-600 hover:text-red-500 disabled:opacity-50"
                >
                  {deletingId === project.id ? "…" : "Delete"}
                </button>
                </div>
              </div>
            </div>
          ))}
          {!projects.length && !loadingProjects ? (
            <div className="text-sm text-black/50">
              No projects yet. Create your first portfolio piece above.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
