/**
 * Client-side helpers to parse text copied from a Google Maps review.
 */

export type ParsedGoogleReviewPaste = {
  rating: number | null;
  relativeTime: string;
  reviewText: string;
};

const RELATIVE_TIME_RE =
  /^(?:edited\s+)?(?:a\s+year\s+ago|\d+\s+years?\s+ago|a\s+month\s+ago|\d+\s+months?\s+ago|a\s+week\s+ago|\d+\s+weeks?\s+ago|yesterday|\d+\s+days?\s+ago|today|an?\s+hour\s+ago|\d+\s+hours?\s+ago|just\s+now)\s*$/i;

const STRUCTURED_META_RE =
  /^(?:price\s+per\s+person|food|service|atmosphere|noise\s*level|wait\s*time|seating\s*type|recommendation\s+for\s+vegetarians|vegetarian\s+offerings|meal\s+type|group\s+visit)\s*[:.]/i;

function countStarGlyphs(line: string): number | null {
  const stars = line.match(/[★⭐]/g);
  if (stars && stars.length >= 1 && stars.length <= 5) return stars.length;
  const empty = line.match(/[☆]/g);
  if (empty && /[★⭐]/.test(line)) {
    const filled = (line.match(/[★⭐]/g) || []).length;
    if (filled >= 1 && filled <= 5) return filled;
  }
  return null;
}

function parseRatedLine(line: string): number | null {
  const m = line.match(/\brated\s+(\d(?:\.\d)?)\s*(?:\/\s*5|out\s+of\s+5)?/i);
  if (m) {
    const n = Math.round(Number(m[1]));
    if (n >= 1 && n <= 5) return n;
  }
  const bare = line.match(/^(\d)\s*(?:\/\s*5|stars?)?$/i);
  if (bare) {
    const n = Number(bare[1]);
    if (n >= 1 && n <= 5) return n;
  }
  return null;
}

/**
 * Parse a blob pasted from Google Maps into rating, relative time, and review body.
 */
export function parseGoogleReviewPaste(raw: string): ParsedGoogleReviewPaste {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { rating: null, relativeTime: "", reviewText: "" };
  }

  const lines = text.split("\n").map((l) => l.trim());
  let rating: number | null = null;
  let relativeTime = "";
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (bodyLines.length) bodyLines.push("");
      continue;
    }

    if (rating == null) {
      const fromStars = countStarGlyphs(line);
      if (fromStars != null && line.replace(/[★⭐☆\s]/g, "").length === 0) {
        rating = fromStars;
        continue;
      }
      const fromRated = parseRatedLine(line);
      if (fromRated != null) {
        rating = fromRated;
        continue;
      }
    }

    if (!relativeTime && RELATIVE_TIME_RE.test(line)) {
      relativeTime = line;
      continue;
    }

    // Skip common Maps attribute rows (keep in paste helper only — user can still paste clean prose)
    if (STRUCTURED_META_RE.test(line)) continue;
    if (/^\$\d+\+?\s*$/.test(line)) continue;
    if (/^(?:like|share|add\s+photos)/i.test(line)) continue;

    bodyLines.push(line);
  }

  // Collapse excessive blank lines
  const reviewText = bodyLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { rating, relativeTime, reviewText };
}
