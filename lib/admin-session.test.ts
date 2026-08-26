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
    process.env.ADMIN_SESSION_SECRET = "test-secret-at-least-32-characters!!";
    delete process.env.ADMIN_ACCESS_CODE;

    const token = createAdminSessionToken();
    expect(token).toBeTruthy();
    expect(verifyAdminSessionToken(token)).toBe(true);
  });

  it("rejects legacy boolean cookie value", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-at-least-32-characters!!";
    expect(verifyAdminSessionToken("true")).toBe(false);
  });

  it("rejects tampered tokens", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-at-least-32-characters!!";
    const token = createAdminSessionToken();
    expect(token).toBeTruthy();
    expect(verifyAdminSessionToken(`${token}x`)).toBe(false);
  });

  it("requires ADMIN_SESSION_SECRET in production", () => {
    const prevVercel = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_ACCESS_CODE = "not-enough-alone";
    expect(createAdminSessionToken()).toBeNull();
    process.env.VERCEL_ENV = prevVercel;
  });
});
