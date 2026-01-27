import Image from "next/image";
import Link from "next/link";
import { workItems } from "../lib/work";

export default function PortfolioPage() {
  return (
    <div>
      <h1 className="section-title">Portfolio</h1>
      <p className="section-subtitle">
        Campaign-ready photography for hospitality, commercial real estate, and fashion clients across the U.S.
      </p>
      <div className="card-grid">
        {workItems.map((item, index) => (
          <Link key={item.slug} className="card" href={`/work/${item.slug}`} style={{ animationDelay: `${index * 120}ms` }}>
            <Image src={item.cover} alt={item.title} width={1200} height={800} />
            <div className="card-body">
              <span className="card-tag">{item.category}</span>
              <h2 className="card-title">{item.title}</h2>
              <p className="card-meta">{item.location} · {item.year}</p>
            </div>
          </Link>
        ))}
      </div>
      <section className="callout">
        <p className="card-tag">Next project</p>
        <h2 className="callout-title">Let’s build your next visual story.</h2>
        <p className="section-subtitle">
          Tell us about your property, timeline, and intended usage. We respond with a tailored scope within 24 hours.
        </p>
        <Link className="btn btn-primary" href="/contact">
          Request availability
        </Link>
      </section>
    </div>
  );
}
