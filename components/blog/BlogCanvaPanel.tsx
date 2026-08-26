"use client";

import { useCallback, useEffect, useState } from "react";
import type { BlogCanvaDesigns, BlogPost, BlogSocialImages } from "@/lib/blog-post-model";
import { blankCanvaDesigns, blankSocialImages } from "@/lib/blog-post-model";
import { getPublicR2Url } from "@/lib/r2";

type CanvaSize = "cover" | "feed" | "story";

type Props = {
  post: BlogPost;
  onPostUpdate: (post: BlogPost) => void;
  onDirty: () => void;
};

const SIZE_META: { size: CanvaSize; label: string; dims: string }[] = [
  { size: "cover", label: "Cover / OG", dims: "1200×630" },
  { size: "feed", label: "Instagram feed", dims: "1080×1080" },
  { size: "story", label: "Story / TikTok", dims: "1080×1920" },
];

function editUrlFor(designs: BlogCanvaDesigns, size: CanvaSize) {
  if (size === "cover") return designs.coverEditUrl;
  if (size === "feed") return designs.feedEditUrl;
  return designs.storyEditUrl;
}

function designIdFor(designs: BlogCanvaDesigns, size: CanvaSize) {
  if (size === "cover") return designs.coverId;
  if (size === "feed") return designs.feedId;
  return designs.storyId;
}

/** Exported graphic for this slot only — never reuse post cover as a fake feed/story. */
function exportUrlFor(post: BlogPost, size: CanvaSize) {
  if (size === "cover") {
    // Only treat cover as a Canva/social export preview when a Canva design exists
    // or the key looks like a canva/social export path
    const url = post.coverImageUrl.trim();
    if (!url) return "";
    const designs = post.canvaDesigns ?? blankCanvaDesigns();
    if (designs.coverId) return url;
    if (/\/canva-cover-|\/social-cover-/.test(url)) return url;
    return "";
  }
  const social = post.socialImages ?? blankSocialImages();
  return size === "feed" ? social.feedUrl : social.storyUrl;
}

function sourceCoverPreview(post: BlogPost) {
  return post.coverImageUrl.trim() ? getPublicR2Url(post.coverImageUrl) : "";
}

export default function BlogCanvaPanel({ post, onPostUpdate, onDirty }: Props) {
  const [configured, setConfigured] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState<CanvaSize | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/canva/oauth", { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        configured?: boolean;
        connected?: boolean;
      };
      if (res.ok && json.ok) {
        setConfigured(Boolean(json.configured));
        setConnected(Boolean(json.connected));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const canva = params.get("canva");
    if (!canva) return;
    if (canva === "connected") {
      setMessage("Canva connected.");
      setConnected(true);
      setConfigured(true);
    } else if (canva === "error") {
      setError(params.get("message") || "Canva authorization failed.");
    }
    params.delete("canva");
    params.delete("message");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  async function connectCanva() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/canva/oauth/start", { credentials: "include" });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        authorizeUrl?: string;
      };
      if (!res.ok || !json.ok || !json.authorizeUrl) {
        throw new Error(json.error || "Could not start Canva OAuth.");
      }
      window.location.href = json.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed.");
      setBusy(false);
    }
  }

  async function disconnectCanva() {
    if (!window.confirm("Disconnect Canva from this admin site?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/canva/oauth", {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Disconnect failed.");
      setConnected(false);
      setMessage("Canva disconnected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createDesigns(sizes: CanvaSize[]) {
    setBusy(true);
    setError("");
    setMessage("Creating Canva designs…");
    try {
      const res = await fetch("/api/admin/blog-posts/canva", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          sizes,
          seedImageUrl: post.coverImageUrl || post.galleryImages[0]?.url || "",
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        post?: BlogPost;
        warnings?: string[];
      };
      if (!res.ok || !json.ok || !json.post) {
        throw new Error(json.error || "Failed to create designs.");
      }
      onPostUpdate(json.post);
      onDirty();
      if (json.warnings?.length) {
        setMessage("Some sizes created.");
        setError(json.warnings.join(" · "));
      } else {
        setMessage("Designs created — open in Canva, then import when ready.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function generateSocialCrops() {
    if (!post.coverImageUrl.trim() && !post.galleryImages[0]?.url) {
      setError("Add a cover image first, then generate feed + story crops.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Generating feed + story from cover…");
    try {
      const res = await fetch("/api/admin/blog-posts/canva/crops", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          sizes: ["feed", "story"],
          sourceImageUrl: post.coverImageUrl || post.galleryImages[0]?.url || "",
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        post?: BlogPost;
      };
      if (!res.ok || !json.ok || !json.post) {
        throw new Error(json.error || "Failed to generate social crops.");
      }
      onPostUpdate(json.post);
      onDirty();
      setMessage("Feed + story graphics ready — save the post to keep them.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Crop generation failed.");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function importSize(size: CanvaSize) {
    setImporting(size);
    setError("");
    setMessage(`Importing ${size}…`);
    try {
      const res = await fetch("/api/admin/blog-posts/canva/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, size }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        post?: BlogPost;
      };
      if (!res.ok || !json.ok || !json.post) {
        throw new Error(json.error || "Import failed.");
      }
      onPostUpdate(json.post);
      onDirty();
      setMessage(
        size === "cover"
          ? "Cover updated from Canva — save the post to keep it."
          : `${size} graphic imported — save the post to keep it.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setMessage("");
    } finally {
      setImporting(null);
    }
  }

  const designs = post.canvaDesigns ?? blankCanvaDesigns();
  const social: BlogSocialImages = post.socialImages ?? blankSocialImages();
  const hasCoverSource = Boolean(post.coverImageUrl.trim() || post.galleryImages[0]?.url);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Canva</p>
          <p className="mt-1 text-sm text-white/65">
            Generate feed + story from your cover anytime. Optionally connect Canva to open
            editable canvases, then import JPGs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!configured ? (
            <span className="self-center text-xs text-white/45">
              Canva Connect optional — set <code className="text-white/70">CANVA_CLIENT_*</code>
            </span>
          ) : connected ? (
            <>
              <span className="self-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-emerald-200">
                Connected
              </span>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                disabled={busy}
                onClick={() => void disconnectCanva()}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy}
              onClick={() => void connectCanva()}
            >
              {busy ? "Redirecting…" : "Connect Canva"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={busy || importing !== null || !hasCoverSource}
          onClick={() => void generateSocialCrops()}
        >
          {busy ? "Working…" : "Generate feed + story from cover"}
        </button>
        {connected ? (
          <>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy || importing !== null}
              onClick={() => void createDesigns(["cover", "feed", "story"])}
            >
              Create Canva canvases
            </button>
            {SIZE_META.map((item) => (
              <button
                key={item.size}
                type="button"
                className="btn btn-ghost text-xs"
                disabled={busy || importing !== null}
                onClick={() => void createDesigns([item.size])}
              >
                Canva {item.label}
              </button>
            ))}
          </>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {SIZE_META.map((item) => {
          const id = designIdFor(designs, item.size);
          const edit = editUrlFor(designs, item.size);
          const exported = exportUrlFor(post, item.size);
          const preview = exported ? getPublicR2Url(exported) : "";
          const sourceOnly =
            item.size === "cover" && !preview ? sourceCoverPreview(post) : "";
          return (
            <div
              key={item.size}
              className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">
                {item.label}
                <span className="ml-2 text-white/35">{item.dims}</span>
              </p>
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview of R2 export
                <img
                  src={preview}
                  alt={`${item.label} export`}
                  className="aspect-video w-full rounded-lg object-cover border border-white/10"
                />
              ) : sourceOnly ? (
                <div className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceOnly}
                    alt="Post cover source"
                    className="aspect-video w-full rounded-lg object-cover border border-white/10 opacity-70"
                  />
                  <p className="text-[0.6rem] uppercase tracking-[0.14em] text-white/40">
                    Post cover (source)
                  </p>
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-white/15 text-[0.65rem] text-white/40">
                  {id
                    ? "Edit in Canva, then import"
                    : item.size === "cover"
                      ? "No cover yet"
                      : "No graphic yet — generate from cover"}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {edit ? (
                  <a
                    href={edit}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost text-[0.65rem]"
                  >
                    Open in Canva
                  </a>
                ) : null}
                {id ? (
                  <button
                    type="button"
                    className="btn btn-primary text-[0.65rem]"
                    disabled={busy || importing !== null}
                    onClick={() => void importSize(item.size)}
                  >
                    {importing === item.size ? "Importing…" : "Import"}
                  </button>
                ) : null}
              </div>
              {item.size !== "cover" && exported ? (
                <p className="truncate font-mono text-[0.6rem] text-white/40">{exported}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {(social.feedUrl || social.storyUrl) && (
        <p className="text-xs text-white/45">
          Social exports are available in the Share panel below after you save.
        </p>
      )}

      {message ? <p className="text-xs text-emerald-200/90">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </section>
  );
}
