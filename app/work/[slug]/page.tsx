import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkBySlug, workItems } from "../../lib/work";

export const dynamicParams = false;

export function generateStaticParams() {
  return workItems.map((item) => ({ slug: item.slug }));
}

export default function WorkPage({ params }: { params: { slug: string } }) {
  const work = getWorkBySlug(params.slug);

  if (!work) {
    notFound();
  }

  return (
    <div>
      <section className="work-hero">
        <div>
          <p className="card-tag">{work.category}</p>
          <h1 className="section-title">{work.title}</h1>
          <p className="section-subtitle">{work.description}</p>
          <p className="card-meta">{work.location} · {work.year}</p>
          <div className="work-stats">
            {work.stats.map((stat) => (
              <div key={stat.label} className="work-stat">
                <strong>{stat.value}</strong>
                <p className="card-meta">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <Image src={work.cover} alt={work.title} width={1200} height={800} />
      </section>

      <section>
        <h2 className="section-title">Gallery</h2>
        <div className="gallery">
          {work.gallery.map((src, index) => (
            <Image
              key={src}
              src={src}
              alt={`${work.title} image ${index + 1}`}
              width={1200}
              height={800}
            />
          ))}
        </div>
      </section>

      <section className="callout">
        <p className="card-tag">Next case study</p>
        <h2 className="callout-title">Explore more recent work.</h2>
        <p className="section-subtitle">
          View the portfolio or get in touch to discuss a new assignment.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" href="/portfolio">
            View portfolio
          </Link>
          <Link className="btn btn-outline" href="/contact">
            Contact studio
          </Link>
        </div>
      </section>
    </div>
  );
}
