import Link from "next/link";
import Reveal from "@/components/Reveal";
import type { WebsiteBlock, WebsiteBlockItem, WebsitePage } from "@/lib/website-pages";

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
  const value = input?.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return `/api/media/public?key=${encodeURIComponent(value.replace(/^\/+/, ""))}`;
}

function Paragraphs({ body }: { body: string }) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <div className="space-y-5 text-base leading-relaxed text-white/78">
      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
      ) : (
        <p>This section is being updated.</p>
      )}
    </div>
  );
}

function BlockHeader({ block }: { block: WebsiteBlock }) {
  return (
    <div>
      {block.eyebrow ? <p className="section-kicker">{block.eyebrow}</p> : null}
      {block.title ? <h2 className="section-title">{block.title}</h2> : null}
      {block.body && block.type !== "hero" && block.type !== "gallery" ? (
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
      <video
        src={src}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} className={className} />;
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
  if (!trimmed || trimmed === "Update this caption.") return "";
  if (trimmed.toLowerCase() === title.toLowerCase()) return "";
  return trimmed;
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
  const title = item.title?.trim() || `Recent project ${index + 1}`;
  const body = showcaseCardBody(title, item.body);
  const label = item.meta?.trim() || `Recent ${String(index + 1).padStart(2, "0")}`;
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
        className={`relative overflow-hidden ${featured ? "aspect-[16/11]" : "aspect-[4/3] shrink-0"}`}
      >
        {item.mediaUrl ? (
          <MediaFrame
            url={item.mediaUrl}
            alt={title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.42),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]" />
        )}

        {!featured ? (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/30 to-transparent"
              aria-hidden
            />
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-14">
              <p className="text-[0.58rem] uppercase tracking-[0.28em] text-white/55">{label}</p>
              <p className="mt-1 font-display text-[0.95rem] font-semibold leading-snug text-white">
                {title}
              </p>
              {body ? (
                <p className="mt-1 line-clamp-2 text-[0.72rem] leading-relaxed text-white/75">
                  {body}
                </p>
              ) : null}
              {motionBadge ? <div className="mt-2">{motionBadge}</div> : null}
            </div>
          </>
        ) : null}
      </div>

      {featured ? (
        <div className="border-t border-white/10 bg-black/45 px-5 py-5 md:px-6 md:py-6">
          <p className="text-[0.62rem] uppercase tracking-[0.3em] text-white/52">{label}</p>
          <p className="mt-2 font-display text-lg font-semibold leading-tight text-white md:text-xl">
            {title}
          </p>
          {body ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/72">{body}</p>
          ) : null}
          {motionBadge ? <div className="mt-3">{motionBadge}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

function RecentProjectsShowcase({ block }: { block: WebsiteBlock }) {
  const items = block.items.length
    ? block.items
    : [
        { title: "Recent project", body: "Add image or video from R2.", meta: "Featured" },
        { title: "Behind the frame", body: "Use this for a motion clip or detail." },
      ];
  const [featured, ...secondary] = items;
  return (
    <div className="relative">
      <div className="absolute -left-8 top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="absolute -right-6 bottom-8 h-56 w-56 rounded-full bg-[#b2673f]/20 blur-3xl" aria-hidden />
      <div className="relative grid gap-4 md:grid-cols-12">
        <RecentProjectCard item={featured} index={0} featured />
        <div className="grid gap-4 md:col-span-5">
          {secondary.slice(0, 2).map((item, index) => (
            <RecentProjectCard key={`${block.id}-${item.title}-${index}`} item={item} index={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RenderBlock({ block }: { block: WebsiteBlock }) {
  if (block.type === "hero") {
    const showcaseOn = block.showcaseEnabled !== false;
    return (
      <Reveal className="relative isolate min-h-[78vh] overflow-hidden px-6 py-24 lg:px-10 lg:py-32">
        <BackgroundMedia block={block} className="opacity-48" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.16),transparent_30%),linear-gradient(90deg,rgba(7,9,11,0.95),rgba(7,9,11,0.70)_48%,rgba(7,9,11,0.92))]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />

        <div
          className={`mx-auto grid max-w-6xl items-center gap-12 ${
            showcaseOn ? "lg:grid-cols-[1.05fr_0.95fr]" : ""
          }`}
        >
          <div>
            {block.eyebrow ? (
              <p className="section-kicker">{block.eyebrow}</p>
            ) : null}
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-white text-balance md:text-7xl">
              {block.title}
            </h1>
            {block.body ? (
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/78 md:text-lg">
                {block.body}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {block.ctaHref && block.ctaLabel ? (
                <Link href={block.ctaHref} className="btn btn-primary">
                  {block.ctaLabel}
                </Link>
              ) : null}
              <Link href="/contact" className="btn btn-ghost">
                Start a project
              </Link>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 text-center">
              {[
                ["500+", "Projects"],
                ["48hr", "Reply"],
                ["NYC", "Metro"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-4 backdrop-blur">
                  <p className="font-display text-xl text-white">{value}</p>
                  <p className="mt-1 text-[0.6rem] uppercase tracking-[0.25em] text-white/50">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {showcaseOn ? (
            <div aria-label="Recent project samples">
              <RecentProjectsShowcase block={block} />
            </div>
          ) : null}
        </div>
      </Reveal>
    );
  }

  if (block.type === "gallery") {
    return (
      <Reveal className="relative isolate min-h-[72vh] overflow-hidden px-6 py-24 lg:px-10 lg:py-28">
        <BackgroundMedia block={block} className="opacity-52" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.12),transparent_32%),linear-gradient(95deg,rgba(7,9,11,0.92),rgba(7,9,11,0.55)_52%,rgba(7,9,11,0.88))]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />

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
    return (
      <Reveal className="relative isolate mx-auto max-w-5xl overflow-hidden px-6 py-8 lg:px-10">
        <BackgroundMedia block={block} className="opacity-25" />
        <div className="rounded-[24px] border border-white/10 bg-black/35 p-6 backdrop-blur-md md:p-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {block.items.map((item) => (
              <div key={`${block.id}-${item.title}`} className="text-center">
                <p className="font-display text-2xl text-white">{item.title}</p>
                <p className="mt-1 text-[0.62rem] uppercase tracking-[0.25em] text-white/55">
                  {item.body}
                </p>
                {item.meta ? <p className="mt-1 text-xs text-white/45">{item.meta}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    );
  }

  if (block.type === "cards") {
    return (
      <Reveal className="section-pad relative isolate mx-auto max-w-6xl overflow-hidden px-6 lg:px-10">
        <BackgroundMedia block={block} className="opacity-22" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-bg)]/70 via-[var(--color-bg)]/45 to-[var(--color-bg)]/80" aria-hidden />
        <BlockHeader block={block} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {block.items.map((item) => (
            <div key={`${block.id}-${item.title}`} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.065] shadow-2xl shadow-black/20 backdrop-blur">
              {item.mediaUrl ? (
                <MediaFrame url={item.mediaUrl} alt={item.title} className="aspect-[4/3] w-full object-cover" />
              ) : null}
              <div className="p-5">
              <h3 className="font-medium text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/72">{item.body}</p>
              {item.meta ? <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/45">{item.meta}</p> : null}
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
        <BackgroundMedia block={block} className="opacity-18" />
        <div className="absolute inset-0 -z-10 bg-[var(--color-bg)]/75" aria-hidden />
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
    return (
      <Reveal className="section-pad mx-auto max-w-5xl px-6 lg:px-10">
        <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-black/60 px-8 py-10">
          {block.mediaUrl ? (
            <>
              <BackgroundMedia block={block} className="opacity-35" />
              <div className="absolute inset-0 -z-10 bg-black/55" />
            </>
          ) : null}
          <BlockHeader block={block} />
          {block.ctaHref && block.ctaLabel ? (
            <Link href={block.ctaHref} className="btn btn-primary mt-6">
              {block.ctaLabel}
            </Link>
          ) : null}
        </div>
      </Reveal>
    );
  }

  if (block.type === "contactForm") {
    return (
      <Reveal className="section-pad relative isolate mx-auto max-w-5xl overflow-hidden px-6 lg:px-10">
        <BackgroundMedia block={block} className="opacity-22" />
        <div className="absolute inset-0 -z-10 bg-[var(--color-bg)]/80" aria-hidden />
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
    <Reveal className="section-pad mx-auto max-w-4xl px-6 lg:px-10">
      <div className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur md:p-8">
        <BackgroundMedia block={block} className="opacity-22" />
        {block.mediaUrl ? <div className="absolute inset-0 -z-10 bg-black/58" aria-hidden /> : null}
        <div>
          <div>
            <BlockHeader block={block} />
            <div className="mt-6">
              <Paragraphs body={block.body} />
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function WebsitePageView({ page }: { page: WebsitePage }) {
  if (page.blocks.length > 0) {
    return (
      <main>
        {page.blocks.map((block) => (
          <RenderBlock key={block.id} block={block} />
        ))}
      </main>
    );
  }

  return (
    <main className="section-pad mx-auto max-w-4xl px-6 lg:px-10">
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
  );
}
