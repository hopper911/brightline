/** Slugs created by scripts/import-myportfolio-journal.ts */
export const IMPORTED_JOURNAL_SLUGS = [
  "waldo-ux-ui-case-study",
  "eshave-ux-ui-case-study",
  "about-kiril-mironyuk",
  "photo-retouching",
  "graphic-design",
  "food-photography",
  "photography",
  "erny",
] as const;

export function isImportedJournalSlug(slug: string): boolean {
  return (IMPORTED_JOURNAL_SLUGS as readonly string[]).includes(slug);
}

/** Clean scraped portfolio text before AI formatting or display. */
export function normalizeImportedBlogBody(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && block !== "&")
    .map((block) => {
      const compact = block.replace(/\s+/g, " ").trim();
      const letters = compact.replace(/[^A-Za-z]/g, "");
      const isShout =
        letters.length >= 3 &&
        letters.length <= 48 &&
        compact === compact.toUpperCase() &&
        /[A-Z]/.test(compact);
      if (isShout) {
        return compact
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }
      return compact;
    })
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
