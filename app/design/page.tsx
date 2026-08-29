import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import DigitalProjectGrid from "@/components/design/DigitalProjectGrid";
import { ProcessSteps } from "@/components/design/DesignChrome";
import { getDesignSectionSettings } from "@/lib/design-section-settings";
import { listPublishedDesignProjects } from "@/lib/queries/design";
import { DESIGN_PORTFOLIO_CATEGORIES } from "@/lib/design/categories";
import { BRAND } from "@/lib/config/brand";
import { getResumePageSettings } from "@/lib/feature-flags";
import { PUBLIC_PAGE_REVALIDATE_SECONDS } from "@/lib/public-page-cache";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

type Props = {
  searchParams?: Promise<{ discipline?: string; category?: string }>;
};

const PROCESS = [
  { title: "Research", body: "Understand the real workflow, constraints, and people involved." },
  { title: "Define", body: "Clarify goals, success criteria, and the problem worth solving." },
  { title: "Structure", body: "Map information architecture, roles, and primary journeys." },
  { title: "Design", body: "Shape interfaces that are clear under operational pressure." },
  { title: "Build", body: "Implement practical systems with maintainable architecture." },
  { title: "Test", body: "Validate with real scenarios and revise based on friction." },
  { title: "Improve", body: "Ship iteratively and refine based on use—not novelty." },
];

const CAPABILITIES = [
  "Product design",
  "UX/UI design",
  "Graphic design",
  "Web design",
  "Design systems",
  "Product strategy",
  "AI workflows",
  "Business automation",
  "Project management",
  "Technical implementation",
];

export async function generateMetadata() {
  const settings = await getDesignSectionSettings();
  if (!settings.enabled) return { title: "Not found" };
  return {
    title: `${settings.hubLabel} · ${BRAND.name}`,
    description: settings.hubDescription,
    openGraph: {
      title: `${settings.hubLabel} · ${BRAND.name}`,
      description: settings.hubDescription,
    },
  };
}

export default async function DesignHubPage({ searchParams }: Props) {
  const settings = await getDesignSectionSettings();
  if (!settings.enabled) notFound();

  const resume = await getResumePageSettings();
  const sp = (await searchParams) ?? {};
  const categoryRaw =
    typeof sp.category === "string"
      ? sp.category
      : typeof sp.discipline === "string"
        ? sp.discipline
        : undefined;
  const category =
    categoryRaw && DESIGN_PORTFOLIO_CATEGORIES.some((c) => c.id === categoryRaw)
      ? categoryRaw
      : undefined;

  const projects = await listPublishedDesignProjects(category);
  const filterIds = [
    "product",
    "ux-ui",
    "graphic",
    "web",
    "ai-automation",
  ] as const;

  return (
    <>
      <AssignedPageBackground pageKey="design" emptyFallback />
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-28 lg:px-10">
        <Reveal>
          <p className="section-kicker">{settings.hubLabel}</p>
          <h1 className="mt-3 font-display text-4xl text-white md:text-5xl lg:text-6xl text-balance">
            Designing practical products for real operational problems.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
            {settings.hubDescription ||
              "Selected product, UX, web, graphic-design, and automation work from Brightline’s design and digital practice."}
          </p>
          <p className="mt-3 text-sm text-white/50">
            Distinct from{" "}
            <Link href="/work" className="underline underline-offset-4 hover:text-white/75">
              photography Work
            </Link>
            .
          </p>
          <div className="btn-row mt-8">
            {resume.enabled ? (
              <Link href="/resume" className="btn btn-ghost">
                View résumé
              </Link>
            ) : null}
            <Link href="/contact?service=digital" className="btn btn-primary">
              Design inquiry
            </Link>
          </div>
        </Reveal>

        <Reveal className="mt-16">
          <p className="section-kicker">Capabilities</p>
          <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">What this practice covers</h2>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item) => (
              <li
                key={item}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75"
              >
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="mt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Projects</p>
              <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">Selected work</h2>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/design"
              className={`rounded-full border px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] ${
                !category
                  ? "border-white/40 text-white"
                  : "border-white/15 text-white/55 hover:border-white/30"
              }`}
            >
              All
            </Link>
            {filterIds.map((id) => {
              const label = DESIGN_PORTFOLIO_CATEGORIES.find((c) => c.id === id)?.label ?? id;
              return (
                <Link
                  key={id}
                  href={`/design?category=${id}`}
                  className={`rounded-full border px-4 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] ${
                    category === id
                      ? "border-white/40 text-white"
                      : "border-white/15 text-white/55 hover:border-white/30"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <DigitalProjectGrid projects={projects} />
        </Reveal>

        <Reveal className="mt-20">
          <p className="section-kicker">Process</p>
          <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">How the work moves</h2>
          <div className="mt-8">
            <ProcessSteps steps={PROCESS} />
          </div>
        </Reveal>

        <Reveal className="mt-20">
          <p className="section-kicker">Background</p>
          <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">
            Built from operations, design, and production
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
            Graphic design education, UX practice, hospitality operations, business management,
            commercial photography, product development, automation, and technical implementation—
            used together to ship tools that hold up under real workflows.
          </p>
          <div className="btn-row mt-8">
            {resume.enabled ? (
              <Link href="/resume" className="btn btn-primary">
                View résumé
              </Link>
            ) : null}
            <Link href="/contact?service=employment" className="btn btn-ghost">
              Employment inquiry
            </Link>
            <Link href="/about" className="btn btn-ghost">
              About
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}
