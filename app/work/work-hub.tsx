"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import PortfolioCard from "@/components/PortfolioCard";

type WorkItem = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  location: string;
  year: string;
  cover: string;
  featured: boolean;
  tags: string[];
};

type Category = { label: string; value: string };

export default function WorkHub({
  items,
  tags,
  categories,
}: {
  items: WorkItem[];
  tags: string[];
  categories: Category[];
}) {
  const [category, setCategory] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "featured">("newest");

  const filtered = useMemo(() => {
    const filteredItems = items.filter((item) => {
      if (category !== "all" && item.categorySlug !== category) return false;
      if (tag !== "all" && !item.tags.includes(tag)) return false;
      return true;
    });

    const sortedItems = [...filteredItems].sort((a, b) => {
      if (sort === "featured") {
        const aFeatured = a.featured ? 1 : 0;
        const bFeatured = b.featured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
      }
      const aYear = Number.parseInt(a.year, 10) || 0;
      const bYear = Number.parseInt(b.year, 10) || 0;
      return bYear - aYear;
    });

    return sortedItems;
  }, [items, category, tag, sort]);

  const hasTags = tags.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Reveal>
        <p className="text-xs uppercase tracking-[0.35em] text-black/50">
          Portfolio
        </p>
        <h1 className="section-title mt-4">Work</h1>
        <p className="section-subtitle">
          Curated commercial, hospitality, and fashion projects.
        </p>
        <Link
          href="/portfolio"
          className="mt-4 inline-block text-xs uppercase tracking-[0.3em] text-black/60 hover:text-black transition-colors"
        >
          Portfolio by category →
        </Link>
      </Reveal>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-[0.3em] text-black/50">
          Category
        </span>
        <button
          type="button"
          className={`btn btn-ghost ${category === "all" ? "opacity-100" : "opacity-60"}`}
          onClick={() => setCategory("all")}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`btn btn-ghost ${category === c.value ? "opacity-100" : "opacity-60"}`}
            onClick={() => setCategory(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {hasTags ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-black/50">
            Tags
          </span>
          <button
            type="button"
            className={`btn btn-ghost ${tag === "all" ? "opacity-100" : "opacity-60"}`}
            onClick={() => setTag("all")}
          >
            All tags
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className={`btn btn-ghost ${tag === t ? "opacity-100" : "opacity-60"}`}
              onClick={() => setTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-[0.3em] text-black/50">
          Sort
        </span>
        <button
          type="button"
          className={`btn btn-ghost ${sort === "newest" ? "opacity-100" : "opacity-60"}`}
          onClick={() => setSort("newest")}
        >
          Newest
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${sort === "featured" ? "opacity-100" : "opacity-60"}`}
          onClick={() => setSort("featured")}
        >
          Featured
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-black/10 bg-white/70 px-6 py-12 text-center text-sm text-black/60">
          No projects match those filters yet.
        </div>
      ) : (
        <div className="card-grid">
          {filtered.map((item, index) => (
            <Reveal key={item.slug} delay={index * 0.04}>
              <PortfolioCard
                href={`/work/${item.slug}`}
                cover={item.cover}
                alt={item.title}
                tag={item.category}
                title={item.title}
                meta={
                  item.location && item.year
                    ? `${item.location} · ${item.year}`
                    : item.location || item.year || ""
                }
              />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
