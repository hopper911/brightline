import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createMirotechHandoffToken,
  sanitizeMirotechAdminPath,
  verifyMirotechHandoffToken,
} from "@/lib/mirotech-admin-handoff";

describe("mirotech admin handoff", () => {
  const prev = process.env.MIROTECH_ADMIN_HANDOFF_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.MIROTECH_ADMIN_HANDOFF_SECRET;
    else process.env.MIROTECH_ADMIN_HANDOFF_SECRET = prev;
  });

  it("sanitizes destination paths", () => {
    expect(sanitizeMirotechAdminPath("/admin/projects")).toBe("/admin/projects");
    expect(sanitizeMirotechAdminPath("https://evil.com/admin")).toBe("/admin");
    expect(sanitizeMirotechAdminPath("/work")).toBe("/admin");
    expect(sanitizeMirotechAdminPath("../etc")).toBe("/admin");
  });

  it("round-trips a signed handoff token", () => {
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET = "x".repeat(32);
    const token = createMirotechHandoffToken("/admin/projects");
    expect(token).toBeTruthy();
    const verified = verifyMirotechHandoffToken(token);
    expect(verified).toEqual({ ok: true, next: "/admin/projects" });
  });

  it("rejects tampered tokens", () => {
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET = "y".repeat(32);
    const token = createMirotechHandoffToken("/admin")!;
    const bad = `${token.slice(0, -4)}zzzz`;
    expect(verifyMirotechHandoffToken(bad).ok).toBe(false);
    expect(verifyMirotechHandoffToken(null).ok).toBe(false);
  });

  it("rejects expired tokens", () => {
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET = "z".repeat(32);
    const secret = process.env.MIROTECH_ADMIN_HANDOFF_SECRET;
    const exp = Math.floor(Date.now() / 1000) - 10;
    const nonce = "abcd";
    const nextB64 = Buffer.from("/admin", "utf8").toString("base64url");
    const payload = `ho1.${exp}.${nonce}.${nextB64}`;
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    expect(verifyMirotechHandoffToken(`${payload}.${signature}`).ok).toBe(false);
  });
});
