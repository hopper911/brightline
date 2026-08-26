import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AssignedPageBackground from "@/components/AssignedPageBackground";
import SharedWorkProjectView from "@/components/work/SharedWorkProjectView";
import { dualBrandMediaSrc, fetchDualBrandWorkBySlug } from "@/lib/dual-brand/content-api";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchDualBrandWorkBySlug(slug);
  if (!project) return { title: "Project" };
  return {
    title: `${project.seoTitle || project.title} · BRIGHTLINE Photography`,
    description: project.seoDescription || project.summary,
    alternates: { canonical: `/work/shared/${project.slug}` },
  };
}

export default async function SharedWorkProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = await fetchDualBrandWorkBySlug(slug);
  if (!project) notFound();

  const hero =
    dualBrandMediaSrc(project.heroImage) ||
    dualBrandMediaSrc(project.thumbnailImage) ||
    null;

  return (
    <>
      <AssignedPageBackground pageKey="work" fallbackMedia={hero} fallbackPoster={null} />
      <SharedWorkProjectView project={project} />
    </>
  );
}
