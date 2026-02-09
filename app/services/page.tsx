import Link from "next/link";
import BookingButton from "@/components/BookingButton";
import CredibilityBar from "@/components/CredibilityBar";
import ProcessTimeline from "@/components/ProcessTimeline";
import { services } from "./data";
import { CREDIBILITY } from "@/lib/config/credibility";

export const metadata = {
  title: "Services · Bright Line Photography",
  description:
    "Commercial photography services for hospitality, real estate, and fashion brands. View packages, process, pricing, and FAQs.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Services · Bright Line Photography",
    description:
      "Commercial photography services for hospitality, real estate, and fashion brands. View packages, process, pricing, and FAQs.",
    url: "/services",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Bright Line Photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Services · Bright Line Photography",
    description:
      "Commercial photography services for hospitality, real estate, and fashion brands. View packages, process, pricing, and FAQs.",
    images: ["/og-image.svg"],
  },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Hero Section */}
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Services
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-black max-w-3xl">
          High-touch production designed for modern brands.
        </h1>
        <p className="text-base md:text-lg text-black/70 max-w-2xl">
          From art direction to delivery, we help your team build a visual system
          that feels consistent, elevated, and ready for scale.
        </p>
      </section>

      {/* Credibility Stats */}
      <section className="mt-12 rounded-[24px] border border-black/10 bg-black/5 p-6 md:p-8">
        <CredibilityBar variant="light" showDescription />
      </section>

      {/* Service Packages */}
      <section className="mt-16" aria-labelledby="packages">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Packages
        </p>
        <h2 id="packages" className="font-display text-2xl md:text-3xl text-black mt-2">
          Tailored to your industry
        </h2>
        <p className="mt-3 text-base text-black/70 max-w-2xl">
          Each package includes pre-production, on-site capture, and post-production. Scope scales with property size, usage needs, and timeline.
        </p>
        
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group rounded-[24px] border border-black/10 bg-white p-6 shadow-sm transition-all hover:border-black/20 hover:shadow-lg"
            >
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
            </Link>
          ))}
        </div>
      </section>

      {/* Process Timeline */}
      <section className="mt-20" aria-labelledby="process">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Process
        </p>
        <h2 id="process" className="font-display text-2xl md:text-3xl text-black mt-2">
          From inquiry to delivery
        </h2>
        <p className="mt-3 text-base text-black/70 max-w-2xl">
          A streamlined workflow designed for busy marketing teams. We handle the complexity so you can focus on launch.
        </p>
        
        <div className="mt-10">
          <ProcessTimeline variant="light" />
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
            What's included
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
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          FAQs
        </p>
        <h2 id="faqs" className="font-display text-2xl md:text-3xl text-black mt-2">
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
              Ready to start your project?
            </h2>
            <p className="mt-3 text-sm text-white/70">
              Share your project scope, timeline, and goals. We'll respond within 48 hours with a tailored proposal and availability.
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
