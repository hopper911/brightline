import Link from "next/link";
import BookingButton from "@/components/BookingButton";
import CredibilityBar from "@/components/CredibilityBar";
import ProcessTimeline from "@/components/ProcessTimeline";
import WebsitePageView from "@/components/WebsitePageView";
import { BRAND } from "@/lib/config/brand";
import { getEditableServicePages } from "@/lib/service-pages";
import { CREDIBILITY } from "@/lib/config/credibility";
import { STRUCTURED_DELIVERY } from "@/lib/config/strategicPositioning";
import { getPublishedWebsitePageBySlug } from "@/lib/website-pages";
import { getPublicR2Url } from "@/lib/r2";

export const dynamic = "force-dynamic";

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

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={resolved} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />;
}

const additionalServices = [
  {
    title: "AI-assisted content systems",
    body: "Caption starters, metadata structure, content organization, and practical AI workflows that help your visual library move faster across web, search, and social.",
  },
  {
    title: "Website and SEO asset preparation",
    body: "Image naming, alt-text direction, portfolio selects, and page-ready visual packages for launch campaigns and ongoing site refreshes.",
  },
  {
    title: "Social and campaign delivery kits",
    body: "Reusable crops, campaign folders, launch copy prompts, and structured handoffs that make posting and repurposing easier for lean teams.",
  },
];

export const metadata = {
  title: `Services · ${BRAND.name}`,
  description:
    "Premium photography with structured delivery—packages for architecture, real estate, and advertising. Process, pricing, and FAQs.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: `Services · ${BRAND.name}`,
    description:
      "Premium photography with structured delivery—packages for architecture, real estate, and advertising.",
    url: "/services",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Services · ${BRAND.name}`,
    description:
      "Premium photography with structured delivery—packages for architecture, real estate, and advertising.",
    images: ["/og-image.svg"],
  },
};

export default async function ServicesPage() {
  const pageOverride = await getPublishedWebsitePageBySlug("services");
  if (pageOverride) {
    return <WebsitePageView page={pageOverride} />;
  }

  const services = await getEditableServicePages();

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      {/* Hero Section */}
      <section className="space-y-4">
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
          Services
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-white max-w-3xl text-balance">
          Photography built for performance—not just the shoot.
        </h1>
        <p className="text-base md:text-lg text-white/80 max-w-2xl">
          Premium capture plus structured delivery: organized assets, SEO-aware preparation, and guidance so your visuals work across web, search, and social.
        </p>
      </section>

      {/* Credibility Stats */}
      <section className="mt-12 rounded-[24px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <CredibilityBar variant="dark" showDescription />
      </section>

      {/* Service Packages */}
      <section className="mt-16" aria-labelledby="packages">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Packages
        </p>
        <h2 id="packages" className="font-display text-2xl md:text-3xl text-white mt-2">
          Tailored to your industry
        </h2>
        <p className="mt-3 text-base text-white/80 max-w-2xl">
          Each package includes pre-production, capture, post-production, and a structured handoff. Scope scales with space, usage, and timeline.
        </p>
        
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-sm transition-all hover:border-black/20 hover:shadow-lg"
            >
              <div className="h-44 overflow-hidden bg-black/10">
                <ServicePreviewMedia src={service.heroVideo || service.heroImage} title={service.title} />
              </div>
              <div className="p-6">
              <h3 className="font-display text-xl text-black">{service.title}</h3>
              <p className="mt-3 text-sm text-black/70">{service.summary}</p>
              
              <div className="mt-6 border-t border-black/10 pt-4">
                <p className="text-xs uppercase tracking-[0.28em] text-black/50">
                  {service.pricing.label}
                </p>
                <p className="font-display text-lg text-black">{service.pricing.range}</p>
              </div>
              
              <ul className="mt-4 space-y-2">
                {service.deliverables.slice(0, 3).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-black/60">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-black/40" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-black/60 group-hover:text-black transition-colors">
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

      <section className="mt-16" aria-labelledby="additional-services">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Additional services
        </p>
        <h2 id="additional-services" className="font-display text-2xl md:text-3xl text-white mt-2">
          Visual systems beyond the shoot
        </h2>
        <p className="mt-3 max-w-2xl text-base text-white/80">
          For clients who need more than files, we can prepare assets for publishing,
          search, social, and AI-assisted organization while keeping all final actions
          manual and approval-first.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {additionalServices.map((item) => (
            <div key={item.title} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-display text-lg text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="structured-delivery">
        <div className="rounded-[24px] border border-black/10 bg-white p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-black/50" id="structured-delivery">
            {STRUCTURED_DELIVERY.headline}
          </p>
          <p className="mt-3 max-w-2xl text-base text-black/70">{STRUCTURED_DELIVERY.intro}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {STRUCTURED_DELIVERY.bullets.map((line) => (
              <li key={line} className="flex gap-2 text-sm text-black/70">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-black/35" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="mt-20" aria-labelledby="process">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          Process
        </p>
        <h2 id="process" className="font-display text-2xl md:text-3xl text-white mt-2">
          Capture to activation
        </h2>
        <p className="mt-3 text-base text-white/80 max-w-2xl">
          A strategic ladder from imagery to outcomes—structured so your team can move from files to launch without friction.
        </p>
        
        <div className="mt-10">
          <ProcessTimeline variant="dark" />
        </div>
      </section>

      {/* Turnaround & Licensing */}
      <section className="mt-20 grid gap-6 md:grid-cols-2" aria-labelledby="turnaround">
        <div className="rounded-[24px] border border-black/10 bg-white p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-black/50">
            Turnaround
          </p>
          <h3 className="font-display text-xl text-black mt-3">
            Delivery timelines
          </h3>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between border-b border-black/10 pb-3">
              <span className="text-sm text-black/70">Proof gallery</span>
              <span className="text-sm font-medium text-black">{CREDIBILITY.turnaround.proofs}</span>
            </div>
            <div className="flex justify-between border-b border-black/10 pb-3">
              <span className="text-sm text-black/70">Final delivery</span>
              <span className="text-sm font-medium text-black">{CREDIBILITY.turnaround.finals}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-black/70">Rush delivery</span>
              <span className="text-sm font-medium text-black">{CREDIBILITY.turnaround.rush}</span>
            </div>
          </div>
        </div>
        
        <div className="rounded-[24px] border border-black/10 bg-white p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-black/50">
            Usage & licensing
          </p>
          <h3 className="font-display text-xl text-black mt-3">
            What&apos;s included
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/50 mb-3">Standard</p>
              <ul className="space-y-2">
                {CREDIBILITY.licensing.included.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-black/70">
                    <span className="mt-1 text-emerald-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/50 mb-3">Extended</p>
              <ul className="space-y-2">
                {CREDIBILITY.licensing.additional.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-black/70">
                    <span className="mt-1 text-black/40">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-black/50">{CREDIBILITY.licensing.note}</p>
        </div>
      </section>

      {/* FAQs */}
      <section className="mt-20" aria-labelledby="faqs">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60">
          FAQs
        </p>
        <h2 id="faqs" className="font-display text-2xl md:text-3xl text-white mt-2">
          Common questions
        </h2>
        
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {CREDIBILITY.faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[16px] border border-black/10 bg-white p-5 transition-colors hover:border-black/20"
            >
              <summary className="cursor-pointer text-sm font-medium text-black list-none flex items-start justify-between gap-4">
                <span>{faq.question}</span>
                <span className="shrink-0 text-black/40 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-black/70 pr-8">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mt-20 rounded-[32px] border border-white/10 bg-black px-8 py-12 text-white">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">
              Next steps
            </p>
            <h2 className="font-display text-2xl md:text-3xl text-white mt-2">
              Assets that do more than look good
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Tell us about your space, brand, or campaign—we&apos;ll respond with availability and a clear path from capture to delivery.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact?type=inquiry" className="btn btn-light">
              Request a proposal
            </Link>
            <BookingButton className="btn btn-outline-light">
              Book a call
            </BookingButton>
          </div>
        </div>
      </section>
    </div>
  );
}
