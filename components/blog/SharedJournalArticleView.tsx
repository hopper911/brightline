import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getPublicR2Url } from "@/lib/r2";
import { mirotechSiteOrigin } from "@/lib/mirotech-site";

/** Subset of Mirotech journal articlePayload used for Brightline shared parity. */
export type SharedJournalArticlePayload = {
  coverImageAlt?: string;
  pullQuote?: string;
  keyTakeaways?: string;
  photoCredits?: string;
  caseStudy?: {
    brief?: string;
    problem?: string;
    solution?: string;
  };
  galleryImages?: Array<{ url: string; alt?: string }>;
  galleryBlocks?: Array<{ urls?: string[] }>;
  linkedWork?: { slug?: string; title?: string };
};

export type SharedJournalArticleViewModel = {
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  heroImage?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  categories?: string[];
  articlePayload?: SharedJournalArticlePayload | null;
};

export function resolveSharedMediaSrc(value?: string | null): string {
  const v = value?.trim() || "";
  if (!v) return "";
  if (/^(https?:|data:|blob:)/i.test(v) || v.startsWith("/")) return v;
  return getPublicR2Url(v.replace(/^\/+/, ""));
}

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function takeawayLines(raw: string) {
  return raw
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
}

function asPayload(raw: unknown): SharedJournalArticlePayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as SharedJournalArticlePayload;
}

function CaseBlock({ kicker, text }: { kicker: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-6">
      <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">{kicker}</p>
      <div className="mt-3 space-y-3">
        {paragraphs(text).map((block) => (
          <p key={block.slice(0, 48)} className="leading-relaxed text-white/75">
            {block}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Brightline shared journal body — cover, structured payload, blank-line body paragraphs.
 * Mirrors Mirotech JournalArticleView content capabilities (not chrome).
 */
export default function SharedJournalArticleView({
  post,
  previewBanner = false,
  kicker = "Journal · Shared",
  blogIndexHref = "/blog",
}: {
  post: SharedJournalArticleViewModel;
  previewBanner?: boolean;
  kicker?: string;
  blogIndexHref?: string;
}) {
  const article = asPayload(post.articlePayload);
  const cover = resolveSharedMediaSrc(post.heroImage);
  const coverAlt = article?.coverImageAlt?.trim() || post.title;
  const bodyBlocks = post.body ? paragraphs(post.body) : [];
  const takeaways = article?.keyTakeaways ? takeawayLines(article.keyTakeaways) : [];
  const caseStudy = article?.caseStudy;
  const gallery = article?.galleryImages ?? [];
  const galleryFromBlocks =
    article?.galleryBlocks
      ?.flatMap((b) => b.urls || [])
      .filter(Boolean)
      .map((url) => ({ url: url!, alt: post.title })) ?? [];
  const galleryImages = gallery.length ? gallery : galleryFromBlocks;
  const metaBits = [
    post.publishedAt?.trim() || null,
    post.author?.trim() || null,
  ].filter(Boolean);

  return (
    <article className="section-pad relative z-[2] mx-auto max-w-3xl px-6 lg:px-10">
      {previewBanner ? (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Admin preview — not the public URL. Publish the blog version with Primary site including
          Brightline to make{" "}
          <code className="text-amber-50">/blog/shared/{post.slug}</code> live.
        </div>
      ) : null}

      <Reveal>
        <p className="section-kicker">
          {blogIndexHref ? (
            <>
              <Link href={blogIndexHref} className="text-white/60 no-underline hover:text-white">
                Journal
              </Link>
              {" · Shared"}
              {previewBanner ? " · Preview" : ""}
            </>
          ) : (
            kicker
          )}
        </p>
        <h1 className="section-title mt-2 text-white">{post.title}</h1>
        {metaBits.length > 0 ? (
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50">
            {metaBits.join(" · ")}
          </p>
        ) : null}
        {post.excerpt ? (
          <p className="section-subtitle mt-4 text-white/80">{post.excerpt}</p>
        ) : null}
      </Reveal>

      {article?.pullQuote ? (
        <Reveal className="mt-10">
          <blockquote className="border-y border-white/15 py-6 font-display text-xl leading-snug text-white/90">
            {article.pullQuote}
          </blockquote>
        </Reveal>
      ) : null}

      {cover ? (
        <Reveal className="mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={coverAlt}
            className="w-full rounded-xl border border-white/10 object-cover"
          />
        </Reveal>
      ) : null}

      {takeaways.length > 0 ? (
        <Reveal className="mt-10">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-6">
            <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">
              Key takeaways
            </p>
            <ul className="mt-4 list-none space-y-3 p-0 text-white/80">
              {takeaways.map((line) => (
                <li key={line.slice(0, 48)} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      ) : null}

      {caseStudy?.brief || caseStudy?.problem || caseStudy?.solution ? (
        <Reveal>
          {caseStudy.brief ? (
            <CaseBlock kicker="Brief project description" text={caseStudy.brief} />
          ) : null}
          {caseStudy.problem ? <CaseBlock kicker="Overview" text={caseStudy.problem} /> : null}
          {caseStudy.solution ? <CaseBlock kicker="Solution" text={caseStudy.solution} /> : null}
        </Reveal>
      ) : null}

      {bodyBlocks.length > 0 ? (
        <Reveal className="mt-12">
          <div className="space-y-5 text-white/80 leading-relaxed">
            {bodyBlocks.map((block) => (
              <p key={block.slice(0, 40)} className="whitespace-pre-wrap">
                {block}
              </p>
            ))}
          </div>
        </Reveal>
      ) : null}

      {galleryImages.length > 0 ? (
        <Reveal className="mt-12">
          <p className="text-[0.65rem] uppercase tracking-[0.22em] text-white/45">Gallery</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {galleryImages.map((img, index) => {
              const src = resolveSharedMediaSrc(img.url);
              if (!src) return null;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${index}`}
                  src={src}
                  alt={img.alt || post.title}
                  className="aspect-[4/3] w-full rounded-xl border border-white/10 object-cover"
                />
              );
            })}
          </div>
        </Reveal>
      ) : null}

      {article?.photoCredits?.trim() ? (
        <Reveal className="mt-8">
          <p className="text-xs leading-relaxed text-white/45">{article.photoCredits}</p>
        </Reveal>
      ) : null}

      {article?.linkedWork?.slug ? (
        <Reveal className="mt-10">
          <a
            href={`${mirotechSiteOrigin()}/work/${encodeURIComponent(article.linkedWork.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs uppercase tracking-[0.18em] text-white/50 no-underline hover:text-white"
          >
            {article.linkedWork.title
              ? `View related work: ${article.linkedWork.title} →`
              : "View related work →"}
          </a>
        </Reveal>
      ) : null}
    </article>
  );
}
