import Link from "next/link";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import Reveal from "@/components/Reveal";
import { HeroSectionFade } from "@/components/SectionBackgroundBlend";
import { resolveFullBleedMediaUrl } from "@/lib/r2";
import type { WebsiteBlock, WebsiteBlockItem, WebsitePage } from "@/lib/website-pages";
import { getBackgroundMediaFromPage } from "@/lib/website-pages";
import {
  CREDIBILITY,
  isPublicPlaceholderCopy,
  sanitizePublicStatItem,
} from "@/lib/config/credibility";

function isVideoUrl(url: string) {
  const decoded = decodeURIComponent(url);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

function mediaUrl(input?: string | null) {
  return resolveFullBleedMediaUrl(input);
}

function Paragraphs({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter((line) => line && !isPublicPlaceholderCopy(line));
  // Dedupe identical consecutive paragraphs (CMS often repeats hero body in text blocks).
  const deduped: string[] = [];
  for (const paragraph of paragraphs) {
    if (deduped[deduped.length - 1] === paragraph) continue;
    deduped.push(paragraph);
  }
  return (
    <div className="space-y-5 text-base leading-relaxed text-white/78">
      {deduped.length > 0 ? (
        deduped.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
      ) : (
        <p>This section is being updated.</p>
      )}
    </div>
  );
}

function BlockHeader({ block, hideBody = false }: { block: WebsiteBlock; hideBody?: boolean }) {
  return (
    <div>
      {block.eyebrow ? <p className="section-kicker">{block.eyebrow}</p> : null}
      {block.title ? <h2 className="section-title">{block.title}</h2> : null}
      {!hideBody && block.body && block.type !== "hero" && block.type !== "gallery" ? (
        <p className="section-subtitle">{block.body}</p>
      ) : null}
    </div>
  );
}

function MediaFrame({ url, alt, className = "" }: { url: string; alt: string; className?: string }) {
  const src = mediaUrl(url);
  if (!src) return null;
  if (isVideoUrl(src)) {
    return (
      <div className={`relative overflow-hidden image-guard-overlay ${className}`}>
        <video
          src={src}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          draggable={false}
          aria-label={alt}
        />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <div className={`relative overflow-hidden image-guard-overlay ${className}`}>
      <img src={src} alt={alt} draggable={false} className="h-full w-full object-cover" />
    </div>
  );
}

function BackgroundMedia({ block, className = "" }: { block: WebsiteBlock; className?: string }) {
  const src = mediaUrl(block.mediaUrl);
  if (!src) return null;
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        poster={mediaUrl(block.posterUrl) || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={`absolute inset-0 -z-20 h-full w-full object-cover ${className}`}
        aria-hidden
      />
    );
  }
  return (
    <div
      className={`absolute inset-0 -z-20 bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url(${src})` }}
      aria-hidden
    />
  );
}

function showcaseCardBody(title: string, body?: string | null) {
  const trimmed = body?.trim() ?? "";
  if (!trimmed || isPublicPlaceholderCopy(trimmed)) return "";
  if (trimmed.toLowerCase() === title.toLowerCase()) return "";
  return trimmed;
}

function showcaseCardTitle(raw?: string | null) {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || isPublicPlaceholderCopy(trimmed)) return "";
  return trimmed;
}

function showcaseCardLabel(raw?: string | null) {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || isPublicPlaceholderCopy(trimmed)) return "";
  if (/^recent\s+\d+$/i.test(trimmed)) return "";
  return trimmed;
}

function isRenderableShowcaseItem(item: WebsiteBlockItem): boolean {
  const hasMedia = Boolean(item.mediaUrl?.trim());
  if (!hasMedia) return false;
  const title = showcaseCardTitle(item.title);
  const body = showcaseCardBody(title || item.title?.trim() || "", item.body);
  const label = showcaseCardLabel(item.meta);
  // Media-only cards are fine; pure placeholder text without media is not.
  return Boolean(title || body || label || hasMedia);
}

function RecentProjectCard({
  item,
  index,
  featured = false,
}: {
  item: WebsiteBlockItem;
  index: number;
  featured?: boolean;
}) {
  const title = showcaseCardTitle(item.title);
  const body = showcaseCardBody(title || item.title?.trim() || "", item.body);
  const label = showcaseCardLabel(item.meta);
  const altText = title || label || "Project image";
  void index;
  const motionBadge =
    item.mediaUrl && isVideoUrl(mediaUrl(item.mediaUrl)) ? (
      <span className="inline-flex rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[0.58rem] uppercase tracking-[0.22em] text-white/72">
        Motion
      </span>
    ) : null;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden border border-white/12 bg-white/[0.06] shadow-2xl shadow-black/35 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:bg-white/[0.09] ${
        featured ? "rounded-[34px] md:col-span-7" : "rounded-[26px]"
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          featured ? "aspect-[16/11]" : "min-h-[210px] flex-1 aspect-[5/4] sm:min-h-[230px]"
        }`}
      >
        {item.mediaUrl ? (
          <MediaFrame
            url={item.mediaUrl}
            alt={altText}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]" />
        )}

        {!featured ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"
              aria-hidden
            />
            <div className="showcase-card-copy showcase-card-copy--overlay absolute inset-x-0 bottom-0">
              {label ? <p className="showcase-label">{label}</p> : null}
              {title ? (
                <p className="font-display text-[0.98rem] font-semibold leading-snug text-white">
                  {title}
                </p>
              ) : null}
              {body ? (
                <p className="line-clamp-3 text-[0.75rem] leading-relaxed text-white/78">
                  {body}
                </p>
              ) : null}
              {motionBadge ? <div className="mt-1">{motionBadge}</div> : null}
            </div>
          </>
        ) : null}
      </div>

      {featured ? (
        <div className="showcase-card-copy showcase-card-copy--featured">
          {label ? <p className="showcase-label">{label}</p> : null}
          {title ? (
            <p className="font-display text-lg font-semibold leading-snug text-white md:text-xl">
              {title}
            </p>
          ) : null}
          {body ? (
            <p className="line-clamp-4 text-sm leading-relaxed text-white/75">{body}</p>
          ) : null}
          {motionBadge ? <div className="pt-1">{motionBadge}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

function RecentProjectsShowcase({ block }: { block: WebsiteBlock }) {
  const items = block.items.filter(isRenderableShowcaseItem);
  if (items.length === 0) return null;
  const [featured, ...secondary] = items;
  return (
    <div className="relative">
      <div className="absolute -left-8 top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="absolute -right-6 bottom-8 h-56 w-56 rounded-full bg-[#b2673f]/20 blur-3xl" aria-hidden />
      <div className="relative grid gap-4 md:grid-cols-12">
        <RecentProjectCard item={featured} index={0} featured />
        {secondary.length > 0 ? (
          <div className="grid gap-4 md:col-span-5">
            {secondary.slice(0, 2).map((item, index) => (
              <RecentProjectCard key={`${block.id}-${item.title}-${index}`} item={item} index={index + 1} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RenderBlock({ block }: { block: WebsiteBlock }) {
  if (block.type === "hero") {
    const showcaseItems = block.items.filter(isRenderableShowcaseItem);
    const showcaseOn = block.showcaseEnabled !== false && showcaseItems.length > 0;
    const hasHeroMedia = Boolean(block.mediaUrl?.trim());
    return (
      <Reveal className="relative isolate min-h-[78vh] overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        {hasHeroMedia ? <BackgroundMedia block={block} className="opacity-48" /> : null}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(90deg,rgba(7,9,11,0.95),rgba(7,9,11,0.70)_48%,rgba(7,9,11,0.92))]" />
        {hasHeroMedia ? <HeroSectionFade /> : null}

        <div
          className={`mx-auto grid max-w-6xl items-center gap-12 ${
            showcaseOn ? "lg:grid-cols-[1.05fr_0.95fr]" : ""
          }`}
        >
          <div>
            {block.eyebrow ? (
              <p className="section-kicker">{block.eyebrow}</p>
            ) : null}
            <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-white text-balance sm:text-5xl md:text-7xl">
              {block.title}
            </h1>
            {block.body && !isPublicPlaceholderCopy(block.body) ? (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/78 md:text-lg">
                {block.body}
              </p>
            ) : null}
            <div className="btn-row mt-8">
              {block.ctaHref && block.ctaLabel ? (
                <Link href={block.ctaHref} className="btn btn-primary">
                  {block.ctaLabel}
                </Link>
              ) : null}
              <Link href="/contact" className="btn btn-ghost">
                Start a conversation
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-2 text-center sm:gap-3">
              {CREDIBILITY.heroStrip.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-3 backdrop-blur sm:px-3 sm:py-4">
                  <p className="font-display text-lg text-white sm:text-xl">{value}</p>
                  <p className="mt-1 text-[0.55rem] uppercase tracking-[0.2em] text-white/50 sm:text-[0.6rem] sm:tracking-[0.25em]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {showcaseOn ? (
            <div aria-label="Recent project samples">
              <RecentProjectsShowcase block={{ ...block, items: showcaseItems }} />
            </div>
          ) : null}
        </div>
      </Reveal>
    );
  }

  if (block.type === "gallery") {
    const hasGalleryMedia = Boolean(block.mediaUrl?.trim());
    return (
      <Reveal className="relative isolate min-h-[72vh] overflow-hidden px-6 py-24 lg:px-10 lg:py-28">
        {hasGalleryMedia ? <BackgroundMedia block={block} className="opacity-52" /> : null}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.12),transparent_32%),linear-gradient(95deg,rgba(7,9,11,0.92),rgba(7,9,11,0.55)_52%,rgba(7,9,11,0.88))]" />
        {hasGalleryMedia ? <HeroSectionFade /> : null}

        <div className="mx-auto max-w-3xl">
          {block.eyebrow ? <p className="section-kicker">{block.eyebrow}</p> : null}
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[0.98] tracking-[-0.03em] text-white text-balance md:text-6xl">
            {block.title}
          </h1>
          {block.body ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/78 md:text-lg whitespace-pre-line">
              {block.body}
            </p>
          ) : null}
          {block.ctaHref && block.ctaLabel ? (
            <div className="mt-8">
              <Link href={block.ctaHref} className="btn btn-primary">
                {block.ctaLabel}
              </Link>
            </div>
          ) : null}
        </div>
      </Reveal>
    );
  }

  if (block.type === "stats") {
    const items = block.items
      .map((item) => sanitizePublicStatItem(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (items.length === 0) return null;
    return (
      <Reveal className="relative isolate mx-auto max-w-5xl px-6 py-8 lg:px-10">
        {block.mediaUrl?.trim() ? (
          <>
            <BackgroundMedia block={block} className="opacity-25" />
            <div className="absolute inset-0 -z-10 bg-black/20" aria-hidden />
          </>
        ) : null}
        <div className="rounded-[24px] border border-white/10 bg-black/35 p-6 backdrop-blur-md md:p-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={`${block.id}-${item.title}-${item.body}`} className="text-center">
                <p className="font-display text-2xl text-white">{item.title}</p>
                <p className="mt-1 text-[0.62rem] uppercase tracking-[0.25em] text-white/55">
                  {item.body}
                </p>
                {item.meta && !isPublicPlaceholderCopy(item.meta) ? (
                  <p className="mt-1 text-xs text-white/45">{item.meta}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    );
  }

  if (block.type === "cards") {
    const items = block.items.filter(
      (item) =>
        !isPublicPlaceholderCopy(item.title) ||
        !isPublicPlaceholderCopy(item.body) ||
        Boolean(item.mediaUrl?.trim())
    );
    if (items.length === 0) return null;
    return (
      <Reveal className="section-pad relative isolate mx-auto max-w-6xl overflow-hidden px-6 lg:px-10">
        {block.mediaUrl?.trim() ? (
          <>
            <BackgroundMedia block={block} className="opacity-22" />
            <div
              className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-bg)]/70 via-[var(--color-bg)]/45 to-[var(--color-bg)]/80"
              aria-hidden
            />
          </>
        ) : null}
        <BlockHeader block={block} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <div key={`${block.id}-${item.title}`} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.065] shadow-2xl shadow-black/20 backdrop-blur">
              {item.mediaUrl ? (
                <MediaFrame url={item.mediaUrl} alt={item.title} className="aspect-[4/3] w-full object-cover" />
              ) : null}
              <div className="p-5">
              <h3 className="font-medium text-white">{isPublicPlaceholderCopy(item.title) ? "Project" : item.title}</h3>
              {!isPublicPlaceholderCopy(item.body) ? (
                <p className="mt-2 text-sm text-white/72">{item.body}</p>
              ) : null}
              {item.meta && !isPublicPlaceholderCopy(item.meta) ? (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">{item.meta}</p>
              ) : null}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    );
  }

  if (block.type === "list") {
    return (
      <Reveal className="section-pad relative isolate mx-auto max-w-4xl overflow-hidden px-6 lg:px-10">
        {block.mediaUrl?.trim() ? (
          <>
            <BackgroundMedia block={block} className="opacity-18" />
            <div className="absolute inset-0 -z-10 bg-[var(--color-bg)]/75" aria-hidden />
          </>
        ) : null}
        <BlockHeader block={block} />
        <ul className="mt-6 space-y-3 text-white/75">
          {block.items.map((item, index) => (
            <li key={`${block.id}-${item.title}-${index}`} className="flex items-start gap-3">
              {item.mediaUrl ? (
                <MediaFrame url={item.mediaUrl} alt={item.title} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/70" />
              )}
              <span>
                {item.title ? <strong className="text-white">{item.title}: </strong> : null}
                {item.body}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    );
  }

  if (block.type === "cta") {
    // Site-wide Footer owns the bottom CTA — skip page-level CTA blocks to avoid duplicates.
    return null;
  }

  if (block.type === "contactForm") {
    return (
      <Reveal className="section-pad relative isolate mx-auto max-w-5xl overflow-hidden px-6 lg:px-10">
        {block.mediaUrl?.trim() ? (
          <>
            <BackgroundMedia block={block} className="opacity-22" />
            <div className="absolute inset-0 -z-10 bg-[var(--color-bg)]/80" aria-hidden />
          </>
        ) : null}
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8">
            <BlockHeader block={block} />
            <p className="mt-6 text-sm text-white/65">
              Keep this page in Draft to use the full built-in inquiry form. Published overrides show
              this editable contact section.
            </p>
          </div>
          <div className="rounded border border-white/10 bg-black/40 p-6">
            <p className="text-xs uppercase tracking-widest opacity-70">Studio contact</p>
            <h2 className="mt-4 text-xl font-semibold tracking-wide">{block.title || "Let's talk details."}</h2>
            <p className="mt-2 text-sm opacity-80">{block.body || "Email to discuss timelines, scope, and usage needs."}</p>
            <p className="mt-4 text-sm">info@brightlinephotography.com</p>
            {block.ctaHref && block.ctaLabel ? (
              <Link className="btn btn-ghost mt-6" href={block.ctaHref}>
                {block.ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal className="section-pad relative isolate mx-auto max-w-4xl overflow-hidden px-6 lg:px-10">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur md:p-8">
        {block.mediaUrl?.trim() ? (
          <>
            <BackgroundMedia block={block} className="opacity-22" />
            <div className="absolute inset-0 -z-10 bg-black/58" aria-hidden />
          </>
        ) : null}
        <div>
          <div>
            {/* hideBody: body is rendered once below to avoid CMS subtitle + paragraph duplication */}
            <BlockHeader block={block} hideBody />
            <div className="mt-6">
              <Paragraphs body={block.body} />
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default async function WebsitePageView({ page }: { page: WebsitePage }) {
  const pageKey = page.slug;
  const { media, poster } = getBackgroundMediaFromPage(page);

  if (page.blocks.length > 0) {
    return (
      <>
        <AssignedPageBackground
          pageKey={pageKey}
          fallbackMedia={media}
          fallbackPoster={poster}
        />
        <main className="relative z-[2]">
          {page.blocks.map((block) => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </main>
      </>
    );
  }

  return (
    <>
      <AssignedPageBackground
        pageKey={pageKey}
        fallbackMedia={media}
        fallbackPoster={poster}
      />
      <main className="section-pad relative z-[2] mx-auto max-w-4xl px-6 lg:px-10">
        <Reveal>
          {page.eyebrow ? <p className="section-kicker">{page.eyebrow}</p> : null}
          <h1 className="section-title">{page.title}</h1>
          {page.description ? <p className="section-subtitle">{page.description}</p> : null}
        </Reveal>
        <Reveal className="mt-12 rounded-[24px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <Paragraphs body={page.body} />
          {page.ctaHref && page.ctaLabel ? (
            <Link href={page.ctaHref} className="btn btn-primary mt-8">
              {page.ctaLabel}
            </Link>
          ) : null}
        </Reveal>
      </main>
    </>
  );
}
