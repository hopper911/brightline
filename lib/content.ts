import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type ProjectContent = {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  location: string;
  year: string;
  cover: string;
  overview: string;
  goals: string[];
  deliverables: string[];
  gallery: string[];
  results: string;
  cta: string;
  tags: string[];
  featured: boolean;
  status: "PUBLISHED" | "DRAFT";
};

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

function ensureDir() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

function normalizeSlug(filename: string) {
  return filename.replace(/\.mdx?$/, "");
}

function parseProjectFile(filePath: string): ProjectContent | null {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);

  const required = [
    "title",
    "category",
    "categorySlug",
    "location",
    "year",
    "cover",
    "overview",
    "goals",
    "deliverables",
    "gallery",
    "results",
    "cta",
    "status",
  ];

  for (const key of required) {
    if (!(key in data)) return null;
  }

  const slug = normalizeSlug(path.basename(filePath));
  const goals = Array.isArray(data.goals) ? data.goals.map(String) : [];
  const deliverables = Array.isArray(data.deliverables)
    ? data.deliverables.map(String)
    : [];
  const gallery = Array.isArray(data.gallery) ? data.gallery.map(String) : [];
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const status = data.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const featured = Boolean(data.featured);

  return {
    slug,
    title: String(data.title),
    category: String(data.category),
    categorySlug: String(data.categorySlug),
    location: String(data.location),
    year: String(data.year),
    cover: String(data.cover),
    overview: String(data.overview),
    goals,
    deliverables,
    gallery,
    results: String(data.results),
    cta: String(data.cta),
    tags,
    featured,
    status,
  };
}

export function getProjectSlugs() {
  ensureDir();
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"));
}

export function getProjects(): ProjectContent[] {
  ensureDir();
  const files = getProjectSlugs();
  return files
    .map((file) => parseProjectFile(path.join(CONTENT_DIR, file)))
    .filter((item): item is ProjectContent => Boolean(item))
    .filter((item) => item.status === "PUBLISHED");
}

export function getProjectBySlug(slug: string) {
  ensureDir();
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const item = parseProjectFile(filePath);
  if (!item || item.status !== "PUBLISHED") return null;
  return item;
}
