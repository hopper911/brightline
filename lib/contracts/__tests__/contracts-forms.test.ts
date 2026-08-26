import { describe, expect, it } from "vitest";
import { replaceTemplateVariables, htmlToPlainText, escapeHtml, sanitizeHtmlForClientPreview } from "@/lib/contracts/render";
import { sanitizePathSegment } from "@/lib/contracts/r2-keys";
import { parseFieldValue } from "@/lib/forms/validate";
import { FormFieldType } from "@prisma/client";

describe("replaceTemplateVariables", () => {
  it("replaces known keys and escapes HTML", () => {
    const html = "<p>{{clientName}}</p>";
    const out = replaceTemplateVariables(html, { clientName: "<b>X</b>" });
    expect(out).toContain("&lt;b&gt;X&lt;/b&gt;");
  });

  it("leaves unknown placeholders", () => {
    expect(replaceTemplateVariables("{{unknown}}", { clientName: "A" })).toBe("{{unknown}}");
  });
});

describe("htmlToPlainText", () => {
  it("strips tags", () => {
    expect(htmlToPlainText("<p>a</p><br/>b")).toContain("a");
    expect(htmlToPlainText("<p>a</p><br/>b")).toContain("b");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });
});

describe("sanitizeHtmlForClientPreview", () => {
  it("removes script tags and inline handlers", () => {
    const out = sanitizeHtmlForClientPreview('<p onclick="alert(1)">Hi</p><script>alert(1)</script>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onclick");
    expect(out).toContain("Hi");
  });
});

describe("sanitizePathSegment", () => {
  it("sanitizes slug", () => {
    expect(sanitizePathSegment("  Acme & Co!  ", "fallback")).toMatch(/^acme-co/);
  });
});

describe("parseFieldValue", () => {
  it("validates email", () => {
    expect(parseFieldValue(FormFieldType.EMAIL, "a@b.co", null, true)).toBe("a@b.co");
    expect(() => parseFieldValue(FormFieldType.EMAIL, "bad", null, true)).toThrow();
  });
});
