import Link from "next/link";

const serviceList = [
  {
    title: "Brand & Campaign Photography",
    copy: "Editorial-led imagery with a commercial finish for launches, lookbooks, and brand systems.",
  },
  {
    title: "Hospitality & Travel",
    copy: "Full property storytelling, from suites to amenities, built around guest flow and light.",
  },
  {
    title: "Real Estate & Architecture",
    copy: "Architectural detail and scale, captured for leasing, investment, and lifestyle marketing.",
  },
  {
    title: "Content Libraries",
    copy: "Monthly or quarterly production to keep your brand assets cohesive across every channel.",
  },
];

export const metadata = {
  title: "Services · Bright Line Photography",
  description: "Photography services for hospitality, real estate, and lifestyle brands.",
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

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {serviceList.map((service) => (
          <div
            key={service.title}
            className="rounded-[28px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_50px_rgba(27,26,23,0.08)]"
          >
            <h2 className="font-display text-xl text-black">{service.title}</h2>
            <p className="mt-3 text-sm text-black/70">{service.copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-[32px] border border-black/10 bg-black px-8 py-10 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/60">
              Availability
            </p>
            <h2 className="font-display text-2xl text-white">
              Ready to book the next production window?
            </h2>
          </div>
          <Link
            href="/contact"
            className="rounded-full bg-white px-6 py-3 text-xs uppercase tracking-[0.32em] text-black"
          >
            Request a Proposal
          </Link>
        </div>
      </div>
    </div>
  );
}
