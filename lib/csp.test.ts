import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, createCspNonce } from "./csp";

describe("csp", () => {
  it("creates a base64 nonce", () => {
    const nonce = createCspNonce();
    expect(nonce.length).toBeGreaterThan(10);
    expect(nonce).not.toContain(" ");
  });

  it("embeds script nonce and keeps style unsafe-inline", () => {
    const nonce = "testNonceValue";
    const csp = buildContentSecurityPolicy(nonce, "brightline", { isDev: false });
    expect(csp).toContain(`'nonce-${nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });
});
