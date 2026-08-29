import { describe, expect, it } from "vitest";
import { validateServerEnv } from "@/lib/env/server-env";

describe("validateServerEnv", () => {
  it("passes with dummy runtime URLs in non-production", () => {
    const result = validateServerEnv({
      env: {
        DATABASE_URL: "postgresql://localhost/db",
        DIRECT_URL: "postgresql://localhost/db",
        NODE_ENV: "development",
      },
      production: false,
    });
    expect(result.ok).toBe(true);
    expect(result.missingByCategory.required_runtime).toEqual([]);
  });

  it("fails production when ADMIN_SESSION_SECRET missing", () => {
    const result = validateServerEnv({
      env: {
        DATABASE_URL: "postgresql://localhost/db",
        DIRECT_URL: "postgresql://localhost/db",
        NODE_ENV: "production",
      },
      production: true,
    });
    expect(result.ok).toBe(false);
    expect(result.missingByCategory.required_production).toContain("ADMIN_SESSION_SECRET");
  });
});
