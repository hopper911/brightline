import { describe, expect, it } from "vitest";
import { parseGoogleReviewPaste } from "@/lib/parse-google-review-paste";

describe("parseGoogleReviewPaste", () => {
  it("extracts stars, relative time, and body", () => {
    const parsed = parseGoogleReviewPaste(
      ["★★★★★", "4 days ago", "Incredible dinner at Twin Tails.", "Food: 5", "Service: 5"].join(
        "\n"
      )
    );
    expect(parsed.rating).toBe(5);
    expect(parsed.relativeTime).toBe("4 days ago");
    expect(parsed.reviewText).toContain("Incredible dinner");
    expect(parsed.reviewText).not.toContain("Food: 5");
  });

  it("handles rated line", () => {
    const parsed = parseGoogleReviewPaste("Rated 5\nYesterday\nGreat meal.");
    expect(parsed.rating).toBe(5);
    expect(parsed.relativeTime.toLowerCase()).toBe("yesterday");
    expect(parsed.reviewText).toBe("Great meal.");
  });
});
