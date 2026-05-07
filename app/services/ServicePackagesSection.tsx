import Link from "next/link";
import type { Service } from "@/app/services/data";
import { getPublicR2Url } from "@/lib/r2";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

function mediaUrl(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return getPublicR2Url(value);
}

function ServicePreviewMedia({ src, title }: { src: string; title: string }) {
  const resolved = mediaUrl(src);
  if (!resolved) return null;
  if (isVideoUrl(resolved)) {
    return (
      <video
        src={resolved}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={title}
      />
    );
  }

  return (
    // Admin-style preview: R2/external URLs; next/image domains would require config churn.
    // eslint-disable-next-line @next/next/no-img-element -- dynamic R2/CMS URLs
    <img src={resolved} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
  );
}

type Props = {
  services: Service[];
  /** Use after CMS page content to avoid duplicate hero tone; same grid, clearer labels. */
  variant?: "default" | "afterCms";
};

export default function ServicePackagesSection({ services, variant = "default" }: Props) {
  const afterCms = variant === "afterCms";
  const sectionId = afterCms ? "service-detail-pages" : "packages";
  const eyebrow = afterCms ? "Service packages" : "Packages";
  const title = afterCms ? "Detailed service pages" : "Tailored to your industry";

  return (
    <section className={`${afterCms ? "mt-16 border-t border-white/10 pt-16" : "mt-16"}`} aria-labelledby={sectionId}>
      <p className="text-xs uppercase tracking-[0.35em] text-white/60">{eyebrow}</p>
      <h2 id={sectionId} className="font-display text-2xl md:text-3xl text-white mt-2">
        {title}
      </h2>
      <p className="mt-3 text-base text-white/80 max-w-2xl">
        Each package includes pre-production, capture, post-production, and a structured handoff. Scope
        scales with space, usage, and timeline.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <Link
            key={service.slug}
            href={`/services/${service.slug}`}
            className="group overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] shadow-sm transition-all hover:border-white/25 hover:bg-white/[0.07]"
          >
            <div className="h-44 overflow-hidden bg-black/30">
              <ServicePreviewMedia src={service.heroVideo || service.heroImage} title={service.title} />
            </div>
            <div className="p-6">
              <h3 className="font-display text-xl text-white">{service.title}</h3>
              <p className="mt-3 text-sm text-white/70">{service.summary}</p>

              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.28em] text-white/55">{service.pricing.label}</p>
                <p className="font-display text-lg text-white">{service.pricing.range}</p>
              </div>

              <ul className="mt-4 space-y-2">
                {service.deliverables.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-white/45" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70 group-hover:text-white transition-colors">
                View details
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
