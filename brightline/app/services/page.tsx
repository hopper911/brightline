import Link from "next/link";

const services = [
  {
    title: "Commercial Real Estate",
    description:
      "On-site coverage for towers, amenity decks, mixed-use developments, and leasing campaigns.",
  },
  {
    title: "Hospitality & Lifestyle",
    description:
      "Property storytelling, suites, F&B, and social moments designed for brand refreshes.",
  },
  {
    title: "Fashion & Editorial",
    description:
      "Studio and on-location work for lookbooks, campaigns, and creative teams on tight timelines.",
  },
  {
    title: "Production Support",
    description:
      "Art direction, shot lists, talent coordination, and post-production delivery aligned to usage.",
  },
];

export default function ServicesPage() {
  return (
    <div>
      <h1 className="section-title">Services</h1>
      <p className="section-subtitle">
        Full-service commercial photography for teams that need reliable, brand-right visuals.
      </p>

      <div className="card-grid">
        {services.map((service) => (
          <div key={service.title} className="card">
            <div className="card-body">
              <span className="card-tag">Core offering</span>
              <h2 className="card-title">{service.title}</h2>
              <p className="card-meta">{service.description}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="callout">
        <p className="card-tag">Next step</p>
        <h2 className="callout-title">Ready to scope your next shoot?</h2>
        <p className="section-subtitle">
          Share your timeline and usage needs. We&apos;ll reply with a tailored estimate within 24 hours.
        </p>
        <Link className="btn btn-primary" href="/contact">
          Request a quote
        </Link>
      </section>
    </div>
  );
}
