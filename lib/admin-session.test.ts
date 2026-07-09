import { afterEach, describe, expect, it } from "vitest";
import { createAdminSessionToken, verifyAdminSessionToken } from "@/lib/admin-session";

describe("admin session tokens", () => {
  const prevSecret = process.env.ADMIN_SESSION_SECRET;
  const prevCode = process.env.ADMIN_ACCESS_CODE;

  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = prevSecret;
    process.env.ADMIN_ACCESS_CODE = prevCode;
  });

  it("creates and verifies a signed token", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    delete process.env.ADMIN_ACCESS_CODE;

    const token = createAdminSessionToken();
    expect(token).toBeTruthy();
    expect(verifyAdminSessionToken(token)).toBe(true);
  });

  it("rejects legacy boolean cookie value", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    expect(verifyAdminSessionToken("true")).toBe(false);
  });

  it("rejects tampered tokens", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    const token = createAdminSessionToken();
    expect(token).toBeTruthy();
    expect(verifyAdminSessionToken(`${token}x`)).toBe(false);
  });
});
