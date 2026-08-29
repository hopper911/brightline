import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import ProjectStatusBadge from "@/components/design/ProjectStatusBadge";
import ProjectMetadata from "@/components/design/ProjectMetadata";
import CaseStudySection from "@/components/design/CaseStudySection";
import DigitalProjectCard from "@/components/design/DigitalProjectCard";
import { BrowserFrame } from "@/components/design/DesignChrome";
import {
  disciplineLabel,
  getDesignSectionSettings,
} from "@/lib/design-section-settings";
import {
  getPublishedDesignProjectBySlug,
  listRelatedDesignProjects,
} from "@/lib/queries/design";
import {
  DESIGN_CASE_STUDY_SECTION_LABEL,
  DESIGN_CASE_STUDY_SECTION_ORDER,
  caseStudyHasContent,
} from "@/lib/design/case-study";
import { BRAND } from "@/lib/config/brand";
import { pageKeyDesign } from "@/lib/page-backgrounds";
import { parseRelatedServiceLinks } from "@/lib/work-project-related-services";
import { services } from "@/app/services/data";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

function renderSectionBody(value: string | string[]) {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-2 pl-5">
        {value.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return value.split(/\n\n+/).map((para) => (
    <p key={para.slice(0, 24)} className="whitespace-pre-line">
      {para}
    </p>
  ));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getDesignSectionSettings();
  if (!settings.enabled) return { title: "Not found", robots: { index: false } };
  const project = await getPublishedDesignProjectBySlug(slug);
  if (!project) return { title: "Not found", robots: { index: false } };
  const title = project.seoTitle || `${project.title} · ${settings.hubLabel}`;
  const description =
    project.seoDescription || project.summary || settings.hubDescription;
  return {
    title: `${title} · ${BRAND.name}`,
    description,
    alternates: { canonical: `/design/${project.slug}` },
    openGraph: {
      title,
      description: description ?? undefined,
      images: project.ogImageUrl ? [{ url: project.ogImageUrl }] : undefined,
    },
  };
}

export default async function DesignProjectPage({ params }: Props) {
  const { slug } = await params;
  const settings = await getDesignSectionSettings();
  if (!settings.enabled) notFound();

  const project = await getPublishedDesignProjectBySlug(slug);
  if (!project) notFound();

  const related = await listRelatedDesignProjects(slug, 3);
  const serviceLinks = project.relatedServicesEnabled
    ? parseRelatedServiceLinks(project.relatedServicesLinks)
    : [];
  const hasCaseStudy = caseStudyHasContent(project.caseStudy);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary ?? undefined,
    url: `${BRAND.url}/design/${project.slug}`,
    creator: {
      "@type": "Person",
      name: "Kiril Mironyuk",
      worksFor: { "@type": "Organization", name: BRAND.name },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <AssignedPageBackground
        pageKey={pageKeyDesign(project.slug)}
        fallbackMedia={project.coverUrl}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-28 pt-28 lg:px-10">
        <Reveal>
          <Link
            href="/design"
            className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45 hover:text-white/70"
          >
            ← {settings.hubLabel}
          </Link>
          <p className="mt-6 section-kicker">
            {project.disciplines.map(disciplineLabel).join(" · ") || "Design"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl text-white md:text-5xl lg:text-6xl text-balance">
              {project.title}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.summary ? (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
              {project.summary}
            </p>
          ) : null}
          {project.problemStatement ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
              {project.problemStatement}
            </p>
          ) : null}
          <div className="mt-8">
            <ProjectMetadata
              items={[
                { label: "Year", value: project.year ? String(project.year) : "" },
                { label: "Role", value: project.role ?? "" },
                { label: "Timeline", value: project.timelineLabel ?? "" },
                { label: "Platform", value: project.platformLabel ?? "" },
                { label: "Tools", value: project.toolsLabel ?? "" },
                { label: "Team", value: project.teamLabel ?? "" },
                { label: "Industry", value: project.industryLabel ?? "" },
                { label: "Type", value: project.projectTypeLabel ?? "" },
              ]}
            />
          </div>
        </Reveal>

        {project.coverUrl ? (
          <Reveal className="mt-12">
            <BrowserFrame>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.coverUrl}
                alt={project.coverAlt || project.title}
                className="w-full object-cover"
              />
            </BrowserFrame>
          </Reveal>
        ) : null}

        {!hasCaseStudy ? (
          <Reveal className="mt-14 space-y-10">
            {project.brief ? (
              <CaseStudySection title="Overview">
                <p className="whitespace-pre-line">{project.brief}</p>
              </CaseStudySection>
            ) : null}
            {project.approach ? (
              <CaseStudySection title="Approach">
                <p className="whitespace-pre-line">{project.approach}</p>
              </CaseStudySection>
            ) : null}
            {project.outcome ? (
              <CaseStudySection title="Outcome">
                <p className="whitespace-pre-line">{project.outcome}</p>
              </CaseStudySection>
            ) : null}
          </Reveal>
        ) : (
          <div className="mt-10">
            {DESIGN_CASE_STUDY_SECTION_ORDER.map((key) => {
              const value = project.caseStudy[key];
              if (!value || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length)) {
                return null;
              }
              return (
                <Reveal key={key}>
                  <CaseStudySection title={DESIGN_CASE_STUDY_SECTION_LABEL[key]} id={key}>
                    {renderSectionBody(value)}
                  </CaseStudySection>
                </Reveal>
              );
            })}
          </div>
        )}

        {project.specimenBlocks.length ? (
          <Reveal className="mt-16">
            <h2 className="font-display text-2xl text-white md:text-3xl">Gallery</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {project.specimenBlocks.map((block) => (
                <figure key={block.id} className="overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.imageUrl}
                    alt={block.caption || block.applicationLabel || project.title}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                  {(block.applicationLabel || block.caption) && (
                    <figcaption className="border-t border-white/10 px-4 py-3 text-xs text-white/55">
                      {[block.applicationLabel, block.caption].filter(Boolean).join(" — ")}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </Reveal>
        ) : null}

        {project.relatedWork ? (
          <Reveal className="mt-14">
            <p className="text-sm text-white/60">
              Related photography:{" "}
              <Link href={project.relatedWork.href} className="underline underline-offset-4">
                {project.relatedWork.title}
              </Link>
            </p>
          </Reveal>
        ) : null}

        {serviceLinks.length ? (
          <Reveal className="mt-10">
            <p className="text-sm text-white/60">{project.relatedServicesIntro || "Related services"}</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {serviceLinks.map((link) => {
                const svc = services.find((s) => s.slug === link.slug);
                return (
                  <li key={link.slug}>
                    <Link href={`/services/${link.slug}`} className="btn btn-ghost">
                      {link.title || svc?.title || link.slug}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ) : null}

        {related.length ? (
          <Reveal className="mt-20">
            <h2 className="font-display text-2xl text-white">Related projects</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <DigitalProjectCard key={item.slug} project={item} variant="compact" />
              ))}
            </div>
          </Reveal>
        ) : null}

        <Reveal className="mt-16 flex flex-wrap gap-3">
          <Link href="/design" className="btn btn-ghost">
            All design work
          </Link>
          <Link href="/contact?service=digital" className="btn btn-primary">
            Start a conversation
          </Link>
        </Reveal>
      </div>
    </>
  );
}
