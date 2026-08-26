import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl } from "@/lib/ssrf-guard";

describe("assertPublicHttpUrl", () => {
  it("allows public https URLs", () => {
    const url = assertPublicHttpUrl("https://example.com/image.jpg");
    expect(url.hostname).toBe("example.com");
  });

  it("rejects localhost", () => {
    expect(() => assertPublicHttpUrl("http://localhost/secret")).toThrow(/not allowed/i);
  });

  it("rejects private IPv4 literals", () => {
    expect(() => assertPublicHttpUrl("http://127.0.0.1/")).toThrow(/not allowed/i);
    expect(() => assertPublicHttpUrl("http://10.0.0.1/")).toThrow(/not allowed/i);
    expect(() => assertPublicHttpUrl("http://192.168.1.1/")).toThrow(/not allowed/i);
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => assertPublicHttpUrl("file:///etc/passwd")).toThrow(/http/i);
  });
});
