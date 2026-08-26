import Link from "next/link";
import ProjectStatusBadge from "@/components/design/ProjectStatusBadge";
import { designCategoryLabel } from "@/lib/design/categories";
import type { DesignPortfolioStatusId } from "@/lib/design/status";

export type DigitalProjectCardModel = {
  title: string;
  slug: string;
  summary: string | null;
  problemStatement?: string | null;
  year: number | null;
  platformLabel?: string | null;
  status?: DesignPortfolioStatusId | string | null;
  disciplines: string[];
  coverUrl: string | null;
  coverAlt: string | null;
  featured?: boolean;
};

type Props = {
  project: DigitalProjectCardModel;
  variant?: "featured" | "standard" | "compact";
};

export default function DigitalProjectCard({ project, variant = "standard" }: Props) {
  const href = `/design/${project.slug}`;
  const category = project.disciplines[0] ? designCategoryLabel(project.disciplines[0]) : "Design";
  const problem = project.problemStatement?.trim() || project.summary?.trim() || "";
  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";

  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-2xl border border-white/10 bg-black/25 transition hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        isFeatured ? "md:col-span-2" : ""
      }`}
    >
      <div className={`relative overflow-hidden bg-white/[0.03] ${isCompact ? "aspect-[16/10]" : "aspect-[16/10] md:aspect-[16/9]"}`}>
        {project.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.coverUrl}
            alt={project.coverAlt || project.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.25em] text-white/35">
            No cover
          </div>
        )}
      </div>
      <div className={isCompact ? "p-4" : "p-5 md:p-6"}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.62rem] uppercase tracking-[0.22em] text-white/45">{category}</p>
          {project.status ? <ProjectStatusBadge status={project.status} /> : null}
        </div>
        <h3 className={`mt-2 font-display text-white text-balance ${isFeatured ? "text-2xl md:text-3xl" : "text-xl"}`}>
          {project.title}
        </h3>
        {problem ? (
          <p className="mt-2 text-sm leading-relaxed text-white/65 line-clamp-3">{problem}</p>
        ) : null}
        <p className="mt-3 text-xs text-white/45">
          {[project.year, project.platformLabel].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
