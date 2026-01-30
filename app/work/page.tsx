import { getProjects } from "@/lib/content";
import WorkHub from "./work-hub";

export default async function WorkIndexPage() {
  const items = getProjects();

  const tags = Array.from(
    new Set(items.flatMap((item) => item.tags))
  ).sort((a, b) => a.localeCompare(b));

  const categories = Array.from(
    new Map(items.map((item) => [item.categorySlug, item.category])).entries()
  ).map(([value, label]) => ({ value, label }));

  return (
    <WorkHub
      items={items}
      tags={tags}
      categories={categories}
    />
  );
}
