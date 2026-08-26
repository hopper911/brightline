import { describe, expect, it } from "vitest";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";

function req(method: string, headers: Record<string, string>) {
  return new Request("https://brightlinephotography.com/api/admin/blog-posts", {
    method,
    headers,
  });
}

describe("rejectCrossSiteMutation", () => {
  it("allows GET", () => {
    expect(
      rejectCrossSiteMutation(req("GET", { "sec-fetch-site": "cross-site" }))
    ).toBeNull();
  });

  it("blocks cross-site POST", () => {
    const res = rejectCrossSiteMutation(
      req("POST", { "sec-fetch-site": "cross-site", origin: "https://evil.com" })
    );
    expect(res?.status).toBe(403);
  });

  it("allows same-origin POST", () => {
    expect(
      rejectCrossSiteMutation(
        req("POST", {
          "sec-fetch-site": "same-origin",
          origin: "https://brightlinephotography.com",
        })
      )
    ).toBeNull();
  });

  it("blocks mismatched Origin", () => {
    const res = rejectCrossSiteMutation(
      req("POST", {
        "sec-fetch-site": "same-site",
        origin: "https://evil.com",
      })
    );
    expect(res?.status).toBe(403);
  });
});
