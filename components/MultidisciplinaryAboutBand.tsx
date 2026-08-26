import Link from "next/link";
import { getDesignSectionSettings } from "@/lib/design-section-settings";
import { getResumePageSettings } from "@/lib/feature-flags";

/** Multidisciplinary practitioner section — additive; no MiroTech mentions. */
export default async function MultidisciplinaryAboutBand() {
  const [design, resume] = await Promise.all([
    getDesignSectionSettings(),
    getResumePageSettings(),
  ]);
  const showDesignCta = design.enabled && design.showOnAbout;

  return (
    <section className="relative z-[2] mx-auto max-w-6xl px-6 pb-20 lg:px-10">
      <div className="rounded-[28px] border border-white/10 bg-black/35 p-8 backdrop-blur md:p-10">
        <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Practitioner</p>
        <h2 className="mt-3 font-display text-2xl text-white md:text-3xl text-balance">
          Kiril Mironyuk
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
          A multidisciplinary designer, commercial photographer, and product builder based in the New
          York City metro area. His work combines visual communication, operational experience, and
          digital systems design to create tools that are polished, practical, and grounded in real
          workflows.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/60">
          Experience managing complex hospitality operations shaped how he approaches product design:
          understand the real workflow first, reduce unnecessary steps, and make information easier to
          act on.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {[
            "Graphic design",
            "UX/UI",
            "Commercial photography",
            "Hospitality operations",
            "Business management",
            "Product development",
            "AI and automation",
          ].map((item) => (
            <li
              key={item}
              className="rounded-full border border-white/15 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-white/60"
            >
              {item}
            </li>
          ))}
        </ul>
        <div className="btn-row mt-8">
          {showDesignCta ? (
            <Link href="/design" className="btn btn-primary">
              Design & Digital
            </Link>
          ) : null}
          {resume.enabled ? (
            <Link href="/resume" className="btn btn-ghost">
              Résumé
            </Link>
          ) : null}
          <Link href="/contact?service=employment" className="btn btn-ghost">
            Employment inquiry
          </Link>
        </div>
      </div>
    </section>
  );
}
