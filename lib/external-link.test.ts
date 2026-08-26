import { describe, expect, it } from "vitest";
import { externalLinkProps, isExternalHttpUrl } from "@/lib/external-link";

describe("external-link", () => {
  it("treats relative and same-origin as internal", () => {
    expect(isExternalHttpUrl("/work")).toBe(false);
    expect(isExternalHttpUrl("https://brightlinephotography.com/about")).toBe(false);
    expect(isExternalHttpUrl("https://www.brightlinephotography.com/contact")).toBe(false);
    expect(externalLinkProps("/design")).toEqual({});
  });

  it("treats other hosts as external", () => {
    expect(isExternalHttpUrl("https://linkedin.com/in/x")).toBe(true);
    expect(externalLinkProps("https://youtube.com/watch?v=1")).toEqual({
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });
});
