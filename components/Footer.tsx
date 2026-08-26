import Link from "next/link";
import { BRAND } from "@/lib/config/brand";

/**
 * Site-wide bottom: Next step CTA + copyright / Contact / Client Access.
 * Rendered from AppShell on every public page — keep page-level “Next step” blocks out.
 *
 * Transparent shell so site background video shows through; CTA card stays readable.
 * z-10 keeps this above PageBackground (fixed inset-0 z-[1] pointer-events-none).
 */
export default function Footer({
  designLink = null,
  ctaImageUrl = "",
}: {
  designLink?: { label: string; href: string } | null;
  ctaImageUrl?: string;
}) {
  const imageSrc = ctaImageUrl.trim();

  return (
    <footer className="relative z-10 border-t border-white/10 bg-[var(--color-bg)]/35 backdrop-blur-[2px]">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/45 shadow-[0_-12px_48px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <div
            className={
              imageSrc
                ? "grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] md:items-stretch"
                : ""
            }
          >
            {imageSrc ? (
              <div className="relative min-h-[200px] border-b border-white/10 md:min-h-[280px] md:border-b-0 md:border-r md:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/25"
                  aria-hidden
                />
              </div>
            ) : null}

            <div className="px-6 py-10 text-center sm:px-8 sm:py-12 md:text-left">
              <p className="section-kicker">Next step</p>
              <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
                Ready to collaborate?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 md:mx-0">
                Premium photography with structured delivery—assets prepared for web, search, and
                social.
              </p>
              <div className="mt-8 flex justify-center md:justify-start">
                <Link href="/process" className="btn btn-ghost">
                  How we work
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-6 text-center text-[0.65rem] uppercase tracking-[0.3em] text-white/70">
          <div className="flex flex-col items-center gap-2">
            <span>
              © {new Date().getFullYear()} {BRAND.name}
            </span>
            <span className="max-w-sm text-[0.6rem] font-normal normal-case tracking-normal leading-relaxed text-white/65">
              Architecture, advertising, and corporate imagery for brands that need clarity and
              consistency.
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/50">
              {BRAND.sibling.label}
            </span>
            <a
              href={BRAND.sibling.url}
              className="text-[0.65rem] uppercase tracking-[0.2em] text-white/80 no-underline hover:text-white hover:underline"
              rel="noopener noreferrer"
            >
              {BRAND.sibling.name} →
            </a>
          </div>
          <div className="btn-row justify-center">
            <Link href="/contact?service=general" className="btn btn-primary">
              Contact
            </Link>
            <Link href="/client" className="btn btn-ghost">
              Client Access
            </Link>
            {designLink ? (
              <Link href={designLink.href} className="btn btn-ghost">
                {designLink.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
