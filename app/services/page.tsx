import Link from "next/link";
import PrimaryCTA from "@/components/PrimaryCTA";
import { services } from "./data";

export const metadata = {
  title: "Services · Bright Line Photography",
  description: "Photography services for hospitality, real estate, and lifestyle brands.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Services · Bright Line Photography",
    description:
      "Photography services for hospitality, real estate, and lifestyle brands.",
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
      "Photography services for hospitality, real estate, and lifestyle brands.",
    images: ["/og-image.svg"],
  },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Services
        </p>
        <h1 className="font-display text-4xl text-black">
          High-touch production designed for modern brands.
        </h1>
        <p className="text-base text-black/70">
          From art direction to delivery, we help your team build a visual system
          that feels consistent, elevated, and ready for scale.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <Link
            key={service.slug}
            href={`/services/${service.slug}`}
            className="card-luxe p-6"
          >
            <h2 className="font-display text-xl text-white">{service.title}</h2>
            <p className="mt-3 text-sm text-white/70">{service.summary}</p>
            <span className="mt-6 inline-flex text-xs uppercase tracking-[0.3em] text-white/60">
              View details
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-[32px] border border-white/10 bg-black px-8 py-10 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">
              Availability
            </p>
            <h2 className="font-display text-2xl text-white">
              Ready to book the next production window?
            </h2>
          </div>
          <PrimaryCTA service="general" className="btn btn-light" />
        </div>
      </div>
    </div>
  );
}
