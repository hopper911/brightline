import Link from "next/link";

export default function ContactPage() {
  return (
    <div>
      <h1 className="section-title">Contact</h1>
      <p className="section-subtitle">
        Share your project details and timeline. We reply within 24 hours with availability and a tailored scope.
      </p>

      <section className="contact-grid">
        <form className="hero-card">
          <label className="card-tag" htmlFor="name">Name</label>
          <input className="input" id="name" name="name" placeholder="Your name" />
          <label className="card-tag" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" placeholder="you@company.com" />
          <label className="card-tag" htmlFor="project">Project details</label>
          <textarea
            className="input"
            id="project"
            name="project"
            placeholder="Location, number of spaces, target launch date"
            rows={4}
          />
          <button className="btn btn-primary" type="button">
            Send inquiry
          </button>
        </form>

        <div className="hero-card">
          <p className="card-tag">Studio contact</p>
          <h2 className="section-title">Let’s talk details.</h2>
          <p className="section-subtitle">
            Email or call to discuss timelines, scope, and usage needs.
          </p>
          <p className="card-meta">hello@brightline.photo</p>
          <p className="card-meta">+1 (212) 555-0139</p>
          <Link className="btn btn-outline" href="/portfolio">
            View portfolio
          </Link>
        </div>
      </section>
    </div>
  );
}
