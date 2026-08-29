import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@/lib/config/brand";
import { getResumePageSettings } from "@/lib/feature-flags";
import { externalLinkProps } from "@/lib/external-link";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResumePageSettings();
  if (!settings.enabled) return { title: "Not found", robots: { index: false } };
  return {
    title: `Résumé · ${BRAND.name}`,
    description:
      "Kiril Mironyuk — multidisciplinary designer, commercial photographer, and product builder.",
    robots: { index: true, follow: true },
  };
}

const CAPABILITIES = [
  "Product design",
  "UX/UI design",
  "Graphic design",
  "Web design",
  "Commercial photography",
  "Design systems",
  "Workflow automation",
  "Project management",
];

const SELECTED_PROJECTS = [
  { title: "Brightline Studio OS", href: "/design/brightline-studio-os", note: "Internal operations system" },
  { title: "Brightline Client Portal", href: "/design/brightline-client-portal", note: "Live client delivery" },
  { title: "Restaurant Scheduling Platform", href: "/design/restaurant-scheduling-platform", note: "Product concept" },
];

export default async function ResumePage() {
  const settings = await getResumePageSettings();
  if (!settings.enabled) notFound();

  return (
    <div className="resume-page mx-auto max-w-3xl px-6 py-24 text-white lg:px-10 print:max-w-none print:px-0 print:py-8 print:text-black">
      <header className="border-b border-white/15 pb-8 print:border-black/20">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/50 print:text-black/60">
          Résumé
        </p>
        <h1 className="mt-3 font-display text-4xl text-white print:text-black">Kiril Mironyuk</h1>
        <p className="mt-2 text-base text-white/75 print:text-black/80">
          Multidisciplinary designer, commercial photographer, and product builder
        </p>
        <p className="mt-2 text-sm text-white/55 print:text-black/60">
          New York City metro · {BRAND.contact.email}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          {settings.downloadUrl ? (
            <a href={settings.downloadUrl} className="btn btn-primary" download>
              Download résumé
            </a>
          ) : null}
          {settings.linkedinUrl ? (
            <a href={settings.linkedinUrl} className="btn btn-ghost" {...externalLinkProps(settings.linkedinUrl)}>
              LinkedIn
            </a>
          ) : null}
          {settings.githubUrl ? (
            <a href={settings.githubUrl} className="btn btn-ghost" {...externalLinkProps(settings.githubUrl)}>
              GitHub
            </a>
          ) : null}
          <Link href="/contact?service=employment" className="btn btn-ghost">
            Contact
          </Link>
          <Link href="/design" className="btn btn-ghost">
            Design portfolio
          </Link>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-[0.65rem] uppercase tracking-[0.25em] text-white/45 print:text-black/50">
          Summary
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75 print:text-black/80">
          I design and build practical visual and digital systems for real operational problems—
          combining commercial photography production with product thinking, UX/UI, and maintainable
          software for studios and service businesses.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-[0.65rem] uppercase tracking-[0.25em] text-white/45 print:text-black/50">
          Core capabilities
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <li key={item} className="text-sm text-white/75 print:text-black/80">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[0.65rem] uppercase tracking-[0.25em] text-white/45 print:text-black/50">
          Experience
        </h2>
        <div className="mt-3 space-y-4 text-sm text-white/75 print:text-black/80">
          <div>
            <p className="font-medium text-white print:text-black">{BRAND.name}</p>
            <p className="text-white/55 print:text-black/60">Founder · Commercial photography & digital systems</p>
            <p className="mt-2 leading-relaxed">
              Built the public photography brand, client delivery systems, and Studio OS workflows used
              to run production, galleries, packages, and operations.
            </p>
          </div>
          <div>
            <p className="font-medium text-white print:text-black">Hospitality operations background</p>
            <p className="mt-2 leading-relaxed">
              Experience managing complex service operations informs product decisions: understand the
              real workflow first, reduce unnecessary steps, and make information easier to act on.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[0.65rem] uppercase tracking-[0.25em] text-white/45 print:text-black/50">
          Selected projects
        </h2>
        <ul className="mt-3 space-y-3">
          {SELECTED_PROJECTS.map((p) => (
            <li key={p.title} className="text-sm">
              <Link href={p.href} className="text-white underline-offset-4 hover:underline print:text-black">
                {p.title}
              </Link>
              <span className="text-white/50 print:text-black/55"> — {p.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[0.65rem] uppercase tracking-[0.25em] text-white/45 print:text-black/50">
          Education & focus
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/75 print:text-black/80">
          Graphic design foundation, UX/UI practice, commercial photography production, and product
          development for operational tools.
        </p>
      </section>

      <style>{`
        @media print {
          .resume-page a { text-decoration: none; color: inherit; }
          nav, footer, .btn { display: none !important; }
        }
      `}</style>
    </div>
  );
}
