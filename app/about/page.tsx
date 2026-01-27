import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      <h1 className="section-title">About the studio</h1>
      <p className="section-subtitle">
        Bright Line Photography is a boutique studio specializing in commercial real estate, hospitality, and editorial imagery. We partner with developers, brokers, and creative teams to build imagery that feels editorial and performs commercially.
      </p>

      <section className="hero">
        <div className="hero-card">
          <p className="card-tag">Our approach</p>
          <h2 className="section-title">Planning-forward, art-directed, on time.</h2>
          <p className="section-subtitle">
            Every shoot begins with a visual brief and location walkthrough. We align on light windows, hero moments, and story beats so production feels smooth and intentional.
          </p>
        </div>
        <div className="hero-card">
          <p className="card-tag">Capabilities</p>
          <ul className="section-subtitle">
            <li>Architecture and interiors</li>
            <li>Twilight and skyline composites</li>
            <li>Editorial lifestyle inserts</li>
            <li>On-set art direction</li>
          </ul>
        </div>
      </section>

      <section className="callout">
        <p className="card-tag">Let’s collaborate</p>
        <h2 className="callout-title">Need a photo partner who can scale with your pipeline?</h2>
        <p className="section-subtitle">
          We work with teams managing multi-property portfolios and fast-paced leasing cycles.
        </p>
        <Link className="btn btn-primary" href="/contact">
          Schedule a consult
        </Link>
      </section>
    </div>
  );
}
