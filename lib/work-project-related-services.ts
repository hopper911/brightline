export type RelatedServiceLink = {
  slug: string;
  title: string;
};

export function parseRelatedServiceLinks(value: unknown): RelatedServiceLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const slug = "slug" in item ? String(item.slug ?? "").trim() : "";
      const title = "title" in item ? String(item.title ?? "").trim() : "";
      if (!slug || !title) return null;
      return { slug, title };
    })
    .filter((item): item is RelatedServiceLink => item !== null);
}
