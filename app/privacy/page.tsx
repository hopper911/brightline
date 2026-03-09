import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Bright Line Photography",
  description: "Privacy policy for Bright Line Photography. How we collect, use, and protect your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="section-pad mx-auto max-w-3xl px-6 lg:px-10">
      <h1 className="font-display text-3xl text-white">Privacy Policy</h1>
      <p className="mt-4 text-sm text-white/70">
        Last updated: {new Date().toLocaleDateString("en-US")}
      </p>

      <div className="prose prose-invert mt-8 space-y-6 text-sm text-white/80">
        <section>
          <h2 className="text-base font-semibold text-white">Information We Collect</h2>
          <p>
            When you use our contact form, we collect your name, email address, and
            message. We use this information solely to respond to your inquiry and
            manage our business relationship.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">How We Use Your Information</h2>
          <p>
            We use the information you provide to respond to inquiries, deliver
            services, and communicate about projects. We do not sell or share your
            personal information with third parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">Contact</h2>
          <p>
            For questions about this policy, contact us at{" "}
            <a href="mailto:hello@brightlinephotography.co" className="text-white underline hover:no-underline">
              hello@brightlinephotography.co
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
