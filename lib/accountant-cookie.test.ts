import { afterEach, describe, expect, it } from "vitest";
import { ACCOUNTANT_SESSION_COOKIE, verifyAccountantSessionToken } from "@/lib/accountant-cookie";

describe("accountant-cookie", () => {
  const previous = process.env.ACCOUNTANT_SESSION_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.ACCOUNTANT_SESSION_SECRET;
    else process.env.ACCOUNTANT_SESSION_SECRET = previous;
  });

  it("exports the session cookie name used by proxy", () => {
    expect(ACCOUNTANT_SESSION_COOKIE).toBe("accountant_session");
  });

  it("fails closed without a secret or token", async () => {
    delete process.env.ACCOUNTANT_SESSION_SECRET;
    await expect(verifyAccountantSessionToken("anything")).resolves.toBeNull();
    process.env.ACCOUNTANT_SESSION_SECRET = "test-secret-value";
    await expect(verifyAccountantSessionToken("")).resolves.toBeNull();
    await expect(verifyAccountantSessionToken("not-a-jwt")).resolves.toBeNull();
  });
});
