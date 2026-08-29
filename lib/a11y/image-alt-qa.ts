/** Count gallery or portfolio images missing descriptive alt text. */
export function countImagesMissingAlt(images: ReadonlyArray<{ alt?: string | null }>): number {
  return images.filter((img) => !img.alt?.trim()).length;
}

export function imagesMissingAltMessage(count: number, noun = "image"): string {
  if (count === 0) return "";
  return `${count} ${noun}${count === 1 ? "" : "s"} missing alt text — add descriptions before client delivery.`;
}
