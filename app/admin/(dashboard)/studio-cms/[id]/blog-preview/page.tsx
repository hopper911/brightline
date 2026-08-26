import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SharedJournalArticleView, {
  type SharedJournalArticlePayload,
} from "@/components/blog/SharedJournalArticleView";
import {
  getHubProject,
  isStudioHubConfigured,
  type HubJournalPost,
} from "@/lib/dual-brand/studio-hub";

export const metadata: Metadata = {
  title: "Admin · Hub blog preview",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ site?: string }>;
};

function pickJournal(
  project: NonNullable<Awaited<ReturnType<typeof getHubProject>>>
): HubJournalPost | null {
  const full = project.journalPostsFull;
  if (Array.isArray(full) && full.length > 0) return full[0]!;
  const raw = project.journalPosts as unknown;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as Record<string, unknown>;
    if (typeof first.body === "string") return first as unknown as HubJournalPost;
  }
  return null;
}

/**
 * Draft-safe dual-brand blog preview (Mirotech + Brightline variants).
 * Public /journal and /blog/shared only load when status=PUBLISHED + primarySite allows.
 */
export default async function StudioCmsBlogPreviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const site = sp.site === "mirotech" ? "mirotech" : "brightline";

  if (!isStudioHubConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-white/70">
        Studio hub is not configured.
      </div>
    );
  }

  let project = null;
  try {
    project = await getHubProject(id);
  } catch {
    project = null;
  }
  if (!project) notFound();

  const post = pickJournal(project);
  if (!post) {
    return (
      <div className="min-h-screen bg-[var(--color-bg,#07090b)] px-6 py-16 text-white">
        <Link
          href={`/admin/studio-cms/${encodeURIComponent(id)}`}
          className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white"
        >
          ← Back to Studio CMS
        </Link>
        <p className="mt-8 text-white/70">
          No blog version on this project yet. Generate one in the hub.
        </p>
      </div>
    );
  }

  const isBrightline = site === "brightline";
  const title = isBrightline ? post.titleBrightline?.trim() || post.title : post.title;
  const excerpt = isBrightline
    ? post.excerptBrightline?.trim() || post.excerpt
    : post.excerpt;
  const body = isBrightline ? post.bodyBrightline?.trim() || post.body : post.body;
  const hero = isBrightline
    ? post.heroImageBrightline?.trim() || post.heroImage
    : post.heroImage;
  const liveOk =
    post.status === "PUBLISHED" &&
    (post.primarySite === "BOTH" ||
      post.primarySite === (isBrightline ? "BRIGHTLINE" : "MIROTECH"));
  const liveHref = isBrightline
    ? `https://brightlinephotography.com/blog/shared/${encodeURIComponent(post.slug)}`
    : `https://mirotech.solutions/journal/${encodeURIComponent(post.slug)}`;

  const articlePayload =
    post.articlePayload && typeof post.articlePayload === "object"
      ? (post.articlePayload as SharedJournalArticlePayload)
      : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg,#07090b)] text-white">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link
            href={`/admin/studio-cms/${encodeURIComponent(id)}`}
            className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white"
          >
            ← Back to Studio CMS
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/studio-cms/${encodeURIComponent(id)}/blog-preview?site=mirotech`}
              className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${
                !isBrightline
                  ? "border-white/40 bg-white text-black"
                  : "border-white/15 text-white/70 hover:border-white/30"
              }`}
            >
              Mirotech
            </Link>
            <Link
              href={`/admin/studio-cms/${encodeURIComponent(id)}/blog-preview?site=brightline`}
              className={`rounded-full border px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${
                isBrightline
                  ? "border-white/40 bg-white text-black"
                  : "border-white/15 text-white/70 hover:border-white/30"
              }`}
            >
              Brightline
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-6 lg:px-10">
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Admin preview — status <strong>{post.status}</strong>, primary site{" "}
          <strong>{post.primarySite}</strong>.
          {liveOk ? (
            <>
              {" "}
              Public:{" "}
              <a
                href={liveHref}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                open live →
              </a>
            </>
          ) : (
            <> Publish + set Primary site to include this brand for the public URL.</>
          )}
        </div>
      </div>

      <SharedJournalArticleView
        kicker={isBrightline ? "Brightline · Shared blog" : "Mirotech · Journal"}
        blogIndexHref=""
        post={{
          title,
          slug: post.slug,
          excerpt,
          body,
          heroImage: hero,
          author: post.author,
          publishedAt: post.publishedAt,
          categories: post.categories,
          articlePayload,
        }}
      />
    </div>
  );
}
