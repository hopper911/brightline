import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Bright Line Photography",
  description: "Terms of service for Bright Line Photography. Usage terms for our website and services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="section-pad mx-auto max-w-3xl px-6 lg:px-10">
      <h1 className="font-display text-3xl text-white">Terms of Service</h1>
      <p className="mt-4 text-sm text-white/70">
        Last updated: {new Date().toLocaleDateString("en-US")}
      </p>

      <div className="prose prose-invert mt-8 space-y-6 text-sm text-white/80">
        <section>
          <h2 className="text-base font-semibold text-white">Acceptance</h2>
          <p>
            By using this website and our services, you agree to these terms. If you
            do not agree, please do not use the site.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Services</h2>
          <p>
            Bright Line Photography provides commercial photography services.
            Specific terms for projects are outlined in separate agreements and
            proposals.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Contact</h2>
          <p>
            For questions about these terms, contact us at{" "}
            <a href="mailto:hello@brightlinephotography.co" className="text-white underline hover:no-underline">
              hello@brightlinephotography.co
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
