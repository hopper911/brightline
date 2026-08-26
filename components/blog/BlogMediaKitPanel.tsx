"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogMediaKitAsset, BlogPost } from "@/lib/blog-post-model";
import { blankSocialImages } from "@/lib/blog-post-model";
import type { MediaKitCropMode, MediaKitPreset } from "@/lib/media-kit/presets";
import { getPublicR2Url } from "@/lib/r2";
import { externalLinkProps } from "@/lib/external-link";

type Props = {
  post: BlogPost;
  onPostUpdate: (post: BlogPost) => void;
  onDirty: () => void;
};

function mediaHref(key: string | undefined | null): string {
  if (!key?.trim()) return "";
  return getPublicR2Url(key.trim());
}

function KitAssetDownloads({
  label,
  asset,
  videoKey,
}: {
  label: string;
  asset: Pick<BlogMediaKitAsset, "feedUrl" | "storyUrl" | "videoKey">;
  videoKey?: string;
}) {
  const feed = mediaHref(asset.feedUrl);
  const story = mediaHref(asset.storyUrl);
  const video = mediaHref(videoKey || asset.videoKey);
  if (!feed && !story && !video) return null;

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {feed ? (
          <a
            href={feed} {...externalLinkProps(feed)}
            className="overflow-hidden rounded-lg border border-white/10"
            title="Open feed crop"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={feed} alt="" className="h-20 w-20 object-cover" />
          </a>
        ) : null}
        {story ? (
          <a
            href={story} {...externalLinkProps(story)}
            className="overflow-hidden rounded-lg border border-white/10"
            title="Open story crop"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={story} alt="" className="h-20 w-12 object-cover" />
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {feed ? (
          <a href={feed} {...externalLinkProps(feed)} className="btn btn-ghost text-xs">
            Download feed
          </a>
        ) : null}
        {story ? (
          <a href={story} {...externalLinkProps(story)} className="btn btn-ghost text-xs">
            Download story
          </a>
        ) : null}
        {video ? (
          <a href={video} {...externalLinkProps(video)} className="btn btn-ghost text-xs">
            Download video
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function BlogMediaKitPanel({ post, onPostUpdate, onDirty }: Props) {
  const [presets, setPresets] = useState<MediaKitPreset[]>([]);
  const [presetId, setPresetId] = useState(post.mediaKitPresetId || "editorial");
  const [busy, setBusy] = useState<"pack" | "batch" | "savePreset" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [motionDraft, setMotionDraft] = useState("");
  const [cropMode, setCropMode] = useState<MediaKitCropMode>("attention");
  /** Off by default so packs work with $0 fal balance (crops + captions only). */
  const [includeAiVideo, setIncludeAiVideo] = useState(false);

  const activePreset = useMemo(
    () => presets.find((p) => p.id === presetId) ?? null,
    [presets, presetId]
  );

  const social = post.socialImages ?? blankSocialImages();
  const kitAssets = post.mediaKitAssets ?? [];
  const primaryVideoKey = post.caseStudy?.aiVideoKey || kitAssets[0]?.videoKey || "";
  const hasPrimaryAssets = Boolean(social.feedUrl || social.storyUrl || primaryVideoKey);
  const batchExtras = kitAssets.slice(1);

  useEffect(() => {
    setPresetId(post.mediaKitPresetId || "editorial");
  }, [post.id, post.mediaKitPresetId]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/media-kit/presets", { credentials: "include" });
        const json = (await res.json()) as { ok?: boolean; presets?: MediaKitPreset[] };
        if (res.ok && json.presets) setPresets(json.presets);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (activePreset) {
      setMotionDraft(activePreset.motionPrompt);
      setCropMode(activePreset.cropMode);
    }
  }, [activePreset]);

  async function persistPresets(next: MediaKitPreset[]) {
    const res = await fetch("/api/admin/media-kit/presets", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presets: next }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string; presets?: MediaKitPreset[] };
    if (!res.ok || !json.ok || !json.presets) {
      throw new Error(json.error || "Failed to save presets.");
    }
    setPresets(json.presets);
    return json.presets;
  }

  async function savePresetEdits() {
    if (!activePreset) return;
    setBusy("savePreset");
    setError("");
    try {
      const next = presets.map((p) =>
        p.id === activePreset.id
          ? { ...p, motionPrompt: motionDraft.trim() || p.motionPrompt, cropMode }
          : p
      );
      await persistPresets(next);
      setMessage(`Saved preset “${activePreset.label}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save preset failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveMotionAsCustomPreset() {
    const prompt =
      post.caseStudy?.aiVideoPrompt?.trim() || motionDraft.trim() || activePreset?.motionPrompt || "";
    if (!prompt) {
      setError("Add a motion prompt on the video section or edit the preset first.");
      return;
    }
    const label = window.prompt("Name for this custom preset?", `${post.title.slice(0, 40)} motion`);
    if (!label?.trim()) return;
    setBusy("savePreset");
    setError("");
    try {
      const id = `custom-${Date.now().toString(36)}`;
      const custom: MediaKitPreset = {
        id,
        label: label.trim().slice(0, 80),
        motionPrompt: prompt.slice(0, 500),
        negativePrompt:
          activePreset?.negativePrompt ||
          "blurry, distorted, watermark, text overlay, low quality",
        cropMode,
        captionVoice: activePreset?.captionVoice || "BRIGHTLINE Journal voice.",
        pillarSlugs: [],
      };
      await persistPresets([...presets, custom]);
      setPresetId(id);
      onPostUpdate({ ...post, mediaKitPresetId: id });
      onDirty();
      setMessage(`Created custom preset “${custom.label}”.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create preset failed.");
    } finally {
      setBusy(null);
    }
  }

  async function runPack() {
    setBusy("pack");
    setError("");
    setMessage(
      includeAiVideo
        ? "Building media pack (crops + video + captions)…"
        : "Building media pack (crops + captions, no fal video)…"
    );
    try {
      const res = await fetch("/api/admin/media-kit/pack", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          presetId,
          sourceImageUrl: post.coverImageUrl || post.galleryImages[0]?.url || "",
          skipVideo: !includeAiVideo,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        post?: BlogPost;
        warning?: string;
      };
      if (!res.ok || !json.ok || !json.post) throw new Error(json.error || "Pack failed.");
      onPostUpdate(json.post);
      onDirty();
      setMessage(
        json.warning
          ? `Pack ready. ${json.warning}`
          : "Media pack ready — downloads below."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pack failed.");
      setMessage("");
    } finally {
      setBusy(null);
    }
  }

  async function runBatch() {
    const urls = [post.coverImageUrl, ...post.galleryImages.map((g) => g.url)].filter(Boolean);
    if (urls.length < 1) {
      setError("Add a cover or gallery images first.");
      return;
    }
    if (
      !window.confirm(
        includeAiVideo
          ? `Run batch on ${Math.min(urls.length, 8)} stills? First still may use fal credits for AI video.`
          : `Run batch on ${Math.min(urls.length, 8)} stills? Crops only (no fal video).`
      )
    ) {
      return;
    }
    setBusy("batch");
    setError("");
    setMessage("Batch running…");
    try {
      const res = await fetch("/api/admin/media-kit/batch", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          presetId,
          sourceImageUrls: urls.slice(0, 8),
          skipVideo: !includeAiVideo,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        post?: BlogPost;
        warning?: string;
      };
      if (!res.ok || !json.ok || !json.post) throw new Error(json.error || "Batch failed.");
      onPostUpdate(json.post);
      onDirty();
      setMessage(
        json.warning
          ? `Batch complete. ${json.warning}`
          : `Batch complete — ${(json.post.mediaKitAssets?.length ?? 0)} assets ready.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed.");
      setMessage("");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Media kit</p>
        <p className="mt-1 text-sm text-white/65">
          Social crops + captions work with no fal credits. AI video is optional and uses fal balance
          when enabled.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
        <input
          type="checkbox"
          checked={includeAiVideo}
          onChange={(e) => setIncludeAiVideo(e.target.checked)}
        />
        Include AI video (requires fal.ai credits)
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[180px] flex-1">
          <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
            Preset
          </span>
          <select
            value={presetId}
            onChange={(e) => {
              setPresetId(e.target.value);
              onPostUpdate({ ...post, mediaKitPresetId: e.target.value });
              onDirty();
            }}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {(presets.length
              ? presets
              : [
                  { id: "editorial", label: "Editorial / journal" },
                  { id: "architecture", label: "Architecture" },
                ]
            ).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary text-xs"
          disabled={busy !== null}
          onClick={() => void runPack()}
        >
          {busy === "pack" ? "Packing…" : "Generate media pack"}
        </button>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          disabled={busy !== null}
          onClick={() => void runBatch()}
        >
          {busy === "batch" ? "Batching…" : "Batch from gallery"}
        </button>
      </div>

      {activePreset ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
          <label className="block">
            <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
              Motion prompt ({activePreset.label})
            </span>
            <textarea
              value={motionDraft}
              onChange={(e) => setMotionDraft(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90"
            />
          </label>
          <label className="inline-block">
            <span className="mb-1 block text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
              Crop mode
            </span>
            <select
              value={cropMode}
              onChange={(e) => setCropMode(e.target.value as MediaKitCropMode)}
              className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="attention">Attention</option>
              <option value="centre">Centre</option>
              <option value="top">Top</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy !== null}
              onClick={() => void savePresetEdits()}
            >
              {busy === "savePreset" ? "Saving…" : "Save preset edits"}
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs"
              disabled={busy !== null}
              onClick={() => void saveMotionAsCustomPreset()}
            >
              Save as custom preset
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-xs text-emerald-200/90">{message}</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {hasPrimaryAssets || batchExtras.length > 0 ? (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
            Generated assets
            {kitAssets.length > 0 ? ` · ${kitAssets.length}` : ""}
          </p>
          {hasPrimaryAssets ? (
            <KitAssetDownloads
              label="Primary"
              asset={{
                feedUrl: social.feedUrl || kitAssets[0]?.feedUrl || "",
                storyUrl: social.storyUrl || kitAssets[0]?.storyUrl || "",
                videoKey: primaryVideoKey,
              }}
              videoKey={primaryVideoKey}
            />
          ) : null}
          {batchExtras.map((asset, i) => (
            <KitAssetDownloads
              key={`${asset.feedUrl}-${asset.storyUrl}-${i}`}
              label={`Batch ${i + 2}`}
              asset={asset}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/40">
          No kit assets yet. Generate a pack (or batch from gallery) to see downloads here.
        </p>
      )}
    </section>
  );
}
