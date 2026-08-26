"use client";

import { useMemo, useState } from "react";
import { externalLinkProps } from "@/lib/external-link";
import type { BlogPost } from "@/lib/blog-post-model";
import { blankShareCaptions, blankSocialImages } from "@/lib/blog-post-model";
import { buildSocialShareDrafts, type SocialSharePlatform } from "@/lib/blog-social-share";
import { getPublicR2Url } from "@/lib/r2";

type Props = {
  post: BlogPost;
  onPostUpdate?: (post: BlogPost) => void;
  onDirty?: () => void;
};

export default function BlogSharePanel({ post, onPostUpdate, onDirty }: Props) {
  const drafts = useMemo(() => {
    const base = buildSocialShareDrafts(post);
    const custom = post.shareCaptions ?? blankShareCaptions();
    return base.map((d) => {
      if (d.platform === "instagram" && custom.instagram.trim()) {
        return { ...d, caption: custom.instagram };
      }
      if (d.platform === "youtube" && custom.youtube.trim()) {
        return { ...d, caption: custom.youtube };
      }
      if (d.platform === "tiktok" && custom.tiktok.trim()) {
        return { ...d, caption: custom.tiktok };
      }
      return d;
    });
  }, [post]);

  const [active, setActive] = useState<SocialSharePlatform>("instagram");
  const [copied, setCopied] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const current = drafts.find((d) => d.platform === active) ?? drafts[0]!;
  const social = post.socialImages ?? blankSocialImages();
  const feedUrl = social.feedUrl ? getPublicR2Url(social.feedUrl) : "";
  const storyUrl = social.storyUrl ? getPublicR2Url(social.storyUrl) : "";
  const coverUrl = post.coverImageUrl ? getPublicR2Url(post.coverImageUrl) : "";

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(current.caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function regenerateCaptions() {
    if (!onPostUpdate) return;
    setAiBusy(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/blog-posts/assist", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "socialCaptions",
          draft: {
            title: post.title,
            excerpt: post.excerpt,
            tags: post.tags,
            body: post.body,
            caseBrief: post.caseStudy?.brief,
          },
          slug: post.slug,
          presetId: post.mediaKitPresetId,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: { instagram?: string; youtube?: string; tiktok?: string };
      };
      if (!res.ok || !json.result) throw new Error(json.error || "Caption AI failed.");
      const next = {
        ...post,
        shareCaptions: {
          instagram: json.result.instagram || "",
          youtube: json.result.youtube || "",
          tiktok: json.result.tiktok || "",
        },
      };
      onPostUpdate(next);
      onDirty?.();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Caption AI failed.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Share</p>
          <p className="mt-1 text-sm text-white/65">
            Captions for Instagram, YouTube, and TikTok — copy and paste into each app.
          </p>
        </div>
        {onPostUpdate ? (
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={aiBusy}
            onClick={() => void regenerateCaptions()}
          >
            {aiBusy ? "Writing…" : "✦ AI captions"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {drafts.map((draft) => (
          <button
            key={draft.platform}
            type="button"
            onClick={() => {
              setActive(draft.platform);
              setCopied(false);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
              active === draft.platform
                ? "border-white/40 bg-white text-black"
                : "border-white/15 bg-black/20 text-white/70 hover:border-white/30 hover:text-white"
            }`}
          >
            {draft.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/45">{current.hint}</p>

      <textarea
        readOnly
        value={current.caption}
        rows={12}
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs leading-relaxed text-white/85"
      />

      {feedUrl || storyUrl || coverUrl ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {feedUrl ? (
            <a href={feedUrl} {...externalLinkProps(feedUrl)} className="btn btn-ghost text-xs">
              Download feed graphic
            </a>
          ) : null}
          {storyUrl ? (
            <a href={storyUrl} {...externalLinkProps(storyUrl)} className="btn btn-ghost text-xs">
              Download story graphic
            </a>
          ) : null}
          {coverUrl ? (
            <a href={coverUrl} {...externalLinkProps(coverUrl)} className="btn btn-ghost text-xs">
              Download cover / OG
            </a>
          ) : null}
        </div>
      ) : null}

      {aiError ? <p className="mt-2 text-xs text-red-300">{aiError}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary text-xs" onClick={() => void copyCaption()}>
          {copied ? "Copied" : "Copy caption"}
        </button>
        {post.status === "PUBLISHED" ? (
          <a
            href={`/blog/${post.slug}`}
            className="btn btn-ghost text-xs"
          >
            Open live post
          </a>
        ) : (
          <span className="self-center text-xs text-amber-100/80">
            Publish the post first so the share link goes live.
          </span>
        )}
      </div>
    </section>
  );
}
