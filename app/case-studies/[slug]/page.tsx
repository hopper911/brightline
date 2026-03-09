import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Reveal from "@/components/Reveal";
import { CASE_STUDIES, getCaseStudyBySlug } from "@/lib/caseStudies";
import { getPublicR2Url } from "@/lib/r2";

export async function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) return { title: "Case Study · Bright Line Photography" };
  const title = `${study.title} · Bright Line Photography`;
  return {
    title,
    description: study.result[0] ?? study.challenge[0],
    alternates: { canonical: `/case-studies/${slug}` },
    openGraph: { title, url: `/case-studies/${slug}` },
  };
}

function imageUrl(key: string): string {
  if (key.startsWith("/")) return key;
  return getPublicR2Url(key);
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();

  return (
    <div className="section-pad mx-auto max-w-6xl px-6 lg:px-10">
      <Reveal className="mb-12">
        <Link href="/case-studies" className="btn btn-ghost mb-6">
          Back to case studies
        </Link>
        <p className="text-[0.65rem] uppercase tracking-[0.35em] text-white/50">
          {study.client} · {study.industry}
        </p>
        <h1 className="section-title mt-2">{study.title}</h1>
      </Reveal>

      <Reveal className="mb-12 grid gap-10 md:grid-cols-3">
        <SectionBlock title="The challenge" items={study.challenge} />
        <SectionBlock title="The approach" items={study.approach} />
        <SectionBlock title="The result" items={study.result} />
      </Reveal>

      <Reveal>
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-white/50">
          Selected images
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {study.imageKeys.map((key, i) => (
            <div
              key={i}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10"
            >
              <Image
                src={imageUrl(key)}
                alt={`${study.title} image ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <Link href="/case-studies" className="btn btn-ghost">
          Back to case studies
        </Link>
      </Reveal>
    </div>
  );
}

function SectionBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-[0.3em] text-white/50">
        {title}
      </h2>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/50" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
