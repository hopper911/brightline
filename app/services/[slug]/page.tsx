import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { services } from "../data";
import WorkCard from "@/components/WorkCard";
import PrimaryCTA from "@/components/PrimaryCTA";
import { workItems } from "@/app/lib/work";
import { getImageAltFallback } from "@/lib/config/brand";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return {
      title: "Service · Bright Line Photography",
      description: "Commercial photography services.",
      alternates: {
        canonical: "/services",
      },
    };
  }

  return {
    title: `${service.title} · Bright Line Photography`,
    description: service.description,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
    openGraph: {
      title: `${service.title} · Bright Line Photography`,
      description: service.description,
      url: `/services/${service.slug}`,
      images: [
        {
          url: service.heroImage,
          width: 1200,
          height: 630,
          alt: service.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.title} · Bright Line Photography`,
      description: service.description,
      images: [service.heroImage],
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = services.find((item) => item.slug === slug);

  if (!service) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="section-title">Service not found</h1>
        <p className="section-subtitle">
          Please return to the services overview.
        </p>
        <Link href="/services" className="btn btn-ghost mt-6">
          Back to services
        </Link>
      </div>
    );
  }

  const getCaseStudyHref = (projectSlug: string) => {
    const project = workItems.find((item) => item.slug === projectSlug);
    if (!project) return "/work";
    return `/work/${project.categorySlug}/${project.slug}`;
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="space-y-4">
          <p className="section-kicker">Service</p>
          <h1 className="section-title">{service.title}</h1>
          <p className="section-subtitle">{service.description}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={service.portfolioHref} className="btn btn-ghost">
              {service.portfolioLabel}
            </Link>
            <PrimaryCTA service={service.slug} className="btn btn-solid" />
          </div>
        </div>
        <div className="panel p-2">
          <div className="relative h-[320px] w-full overflow-hidden rounded-[20px]">
            <Image
              src={service.heroImage}
              alt={service.title}
              fill
              className="object-cover"
              priority
              sizes="(min-width: 1024px) 420px, 100vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA}
            />
          </div>
        </div>
      </section>

      <section className="mt-16">
        <p className="section-kicker">Proof gallery</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {service.proofImages.map((img) => (
            <div key={img} className="card-luxe">
              <div className="relative h-[180px] w-full overflow-hidden">
                <Image
                  src={img}
                  alt={getImageAltFallback(service.title)}
                  fill
                  sizes="(min-width: 1024px) 280px, (min-width: 768px) 45vw, 100vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA}
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16" aria-labelledby="service-industries">
        <p className="section-kicker">Industries served</p>
        <h2 id="service-industries" className="sr-only">
          Industries served
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {service.industries.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white/80"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-10 md:grid-cols-2" aria-labelledby="service-deliverables">
        <div>
          <p className="section-kicker">Deliverables</p>
          <h2 id="service-deliverables" className="sr-only">
            Deliverables
          </h2>
          <ul className="mt-4 space-y-3 text-white/75">
            {service.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-white/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div aria-labelledby="service-process">
          <p className="section-kicker">Process</p>
          <h2 id="service-process" className="sr-only">
            Process
          </h2>
          <ol className="mt-4 space-y-3 text-white/75">
            {service.process.map((item, index) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="service-pricing">
        <p className="section-kicker">Pricing guidance</p>
        <div className="mt-4 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
            <h2 id="service-pricing" className="text-xl font-semibold text-white">
              {service.pricing.label}
            </h2>
            <p className="mt-2 text-3xl font-display text-white">
              {service.pricing.range}
            </p>
            <p className="mt-4 text-sm text-white/70">
              {service.pricing.disclaimer}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Usage & licensing
            </p>
            <p className="mt-3 text-sm text-white/75">
              {service.pricing.licensing}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PrimaryCTA service={service.slug} className="btn btn-solid" />
              <Link
                href={`/contact?service=${service.slug}&type=availability`}
                className="text-xs uppercase tracking-[0.3em] text-white/70 underline"
              >
                Check availability
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="service-case-studies">
        <p className="section-kicker">Case studies</p>
        <p className="mt-3 text-sm text-white/70">
          Explore related projects and outcomes.
        </p>
        <h2 id="service-case-studies" className="sr-only">
          Related case studies
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {service.caseStudies.slice(0, 2).map((item) => (
            <WorkCard
              key={item.slug}
              href={getCaseStudyHref(item.slug)}
              cover={item.image}
              alt={item.title}
              tag={item.category}
              title={item.title}
              meta={item.meta}
            />
          ))}
        </div>
        <div className="mt-6">
          <PrimaryCTA service={service.slug} className="btn btn-solid" />
        </div>
      </section>

      <section className="mt-16">
        <p className="section-kicker">FAQs</p>
        <div className="mt-4 space-y-3">
          {service.faqs.map((faq) => (
            <details
              key={faq.q}
              className="rounded-2xl border border-white/10 bg-black/30 p-5"
            >
              <summary className="cursor-pointer text-sm uppercase tracking-[0.24em] text-white/80">
                {faq.q}
              </summary>
              <p className="mt-3 text-sm text-white/70">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-white/10 pt-16">
        <div className="rounded-2xl border border-white/10 bg-black/60 px-8 py-10">
          <p className="section-kicker">Next step</p>
          <h2 className="font-display text-2xl text-white">
            Let’s scope your production.
          </h2>
          <p className="mt-3 text-sm text-white/70">
            Share timing, usage, and location so we can craft a tailored plan.
          </p>
          <PrimaryCTA service={service.slug} className="btn btn-solid mt-6" />
        </div>
      </section>
    </div>
  );
}
