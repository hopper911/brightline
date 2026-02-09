import Link from "next/link";
import Image from "next/image";
import type { ProjectContent } from "@/lib/content";

const BLUR_DATA =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iNyIgZmlsbD0iI2U4ZTllYSIvPjwvc3ZnPg==";

type WorkHubProps = {
  items: ProjectContent[];
  tags: string[];
  categories: { value: string; label: string }[];
};

export default function WorkHub({ items, tags, categories }: WorkHubProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="section-kicker">Work</p>
      <h1 className="section-title">Case studies</h1>
      <p className="section-subtitle">
        Hospitality, real estate, fashion, and brand storytelling projects.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-black/50">
        {categories.map((category) => (
          <span key={category.value}>{category.label}</span>
        ))}
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/work/${item.slug}`}
            className="group overflow-hidden rounded-[24px] border border-black/10 bg-white/80 shadow-[0_20px_40px_rgba(27,26,23,0.08)]"
          >
            <div className="relative h-[240px] w-full">
              <Image
                src={item.cover}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-black/50">
                {item.category}
              </p>
              <h2 className="mt-3 text-lg text-black">{item.title}</h2>
              <p className="mt-2 text-sm text-black/70">
                {item.location} · {item.year}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}