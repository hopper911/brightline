import Link from "next/link";
import Reveal from "@/components/Reveal";
import type { BlogPost } from "@/lib/blog-post-model";

function formatTagLabel(tag: string) {
  return tag
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type BlogPostFooterProps = {
  tags: string[];
  previous: Pick<BlogPost, "slug" | "title"> | null;
  next: Pick<BlogPost, "slug" | "title"> | null;
  /** Public path prefix for prev/next and "all" link. Default /blog. */
  basePath?: "/blog" | "/travel";
  allLabel?: string;
  navAriaLabel?: string;
};

export default function BlogPostFooter({
  tags,
  previous,
  next,
  basePath = "/blog",
  allLabel = "All journal entries",
  navAriaLabel = "More journal entries",
}: BlogPostFooterProps) {
  const hasNav = Boolean(previous || next);

  return (
    <Reveal className="relative z-10 mt-20" delay={0.1}>
      <footer className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] px-6 py-8 sm:px-8 sm:py-10">
        {tags.length > 0 ? (
          <div className={hasNav ? "border-b border-white/10 pb-8" : ""}>
            <p className="text-[0.62rem] uppercase tracking-[0.28em] text-white/40">Topics</p>
            <p className="mt-4 text-sm leading-relaxed text-white/62">
              {tags.map(formatTagLabel).join(" · ")}
            </p>
          </div>
        ) : null}

        {hasNav ? (
          <nav
            className={`grid gap-4 ${previous && next ? "sm:grid-cols-2" : ""} ${tags.length > 0 ? "mt-8" : ""}`}
            aria-label={navAriaLabel}
          >
            {previous ? (
              <Link
                href={`${basePath}/${previous.slug}`}
                className="group rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20 hover:bg-black/30"
              >
                <span className="text-[0.62rem] uppercase tracking-[0.24em] text-white/42">← Previous</span>
                <span className="mt-2 block font-display text-lg leading-snug text-white/92 transition group-hover:text-white">
                  {previous.title}
                </span>
              </Link>
            ) : null}
            {next ? (
              <Link
                href={`${basePath}/${next.slug}`}
                className={`group rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20 hover:bg-black/30 ${
                  previous ? "sm:text-right" : ""
                }`}
              >
                <span className="text-[0.62rem] uppercase tracking-[0.24em] text-white/42">Next →</span>
                <span className="mt-2 block font-display text-lg leading-snug text-white/92 transition group-hover:text-white">
                  {next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className={`text-center ${hasNav || tags.length > 0 ? "mt-8 border-t border-white/10 pt-6" : ""}`}>
          <Link
            href={basePath}
            className="text-[0.65rem] uppercase tracking-[0.28em] text-white/48 transition hover:text-white"
          >
            {allLabel}
          </Link>
        </div>
      </footer>
    </Reveal>
  );
}
