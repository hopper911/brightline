import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { workItems } from "@/app/lib/work";

export type ProjectContent = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  location: string;
  year: string;
  overview: string;
  cover: string;
  tags: string[];
  goals: string[];
  deliverables: string[];
  highlights: string[];
  gallery: string[];
  results: string;
  cta: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

export function getProjects(): ProjectContent[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return workItems.map((item) => ({
      slug: item.slug,
      title: item.title,
      category: item.category,
      categorySlug: item.categorySlug,
      location: item.location,
      year: item.year,
      overview: item.description,
      cover: item.cover,
      tags: [item.category],
      goals: [],
      deliverables: [],
      highlights: [],
      gallery: item.gallery,
      results: "",
      cta: "Let’s plan your next shoot.",
    }));
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((file) => file.endsWith(".mdx"));
  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data } = matter(raw);
      return {
        slug,
        title: data.title || slug,
        category: data.category || "Case Study",
        categorySlug: data.categorySlug || "case-study",
        location: data.location || "—",
        year: data.year || "—",
        overview: data.overview || "",
        cover: data.cover || "/og-image.svg",
        tags: data.tags || [],
        goals: data.goals || [],
        deliverables: data.deliverables || [],
        highlights: data.highlights || [],
        gallery: data.gallery || [],
        results: data.results || "",
        cta: data.cta || "Let’s plan your next shoot.",
      } as ProjectContent;
    })
    .sort((a, b) => b.year.localeCompare(a.year));
}

export function getProjectBySlug(slug: string) {
  return getProjects().find((project) => project.slug === slug) || null;
}
