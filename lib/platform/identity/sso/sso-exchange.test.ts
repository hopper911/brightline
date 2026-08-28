import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/audit/record-safely", () => ({
  recordAuditSafely: vi.fn().mockResolvedValue({ ok: true, skipped: true }),
}));

vi.mock("@/lib/platform/identity/repository", () => ({
  findPlatformUserById: vi.fn(),
  listPlatformMembershipsForUserInTenant: vi.fn(),
}));

vi.mock("@/lib/platform/authorization/default-authorization-service", () => ({
  defaultAuthorizationService: {
    listPermissions: vi.fn().mockResolvedValue(["platform.identity.read"]),
  },
}));

import { findPlatformUserById, listPlatformMembershipsForUserInTenant } from "@/lib/platform/identity/repository";
import { createSsoExchangeToken, verifySsoExchangeToken } from "@/lib/platform/identity/sso/exchange-token";
import { MemorySsoNonceStore } from "@/lib/platform/identity/sso/nonce-store";
import { sanitizeSsoReturnPath } from "@/lib/platform/identity/sso/redirect-allowlist";
import { SsoExchangeService } from "@/lib/platform/identity/sso/sso-exchange-service";

const savedIdentity = process.env.PLATFORM_IDENTITY_ENABLED;
const savedSecret = process.env.PLATFORM_SSO_EXCHANGE_SECRET;

describe("platform SSO exchange", () => {
  const nonceStore = new MemorySsoNonceStore();
  const service = new SsoExchangeService(nonceStore);

  beforeEach(() => {
    process.env.PLATFORM_IDENTITY_ENABLED = "true";
    process.env.PLATFORM_SSO_EXCHANGE_SECRET = "test-platform-sso-exchange-secret-32chars-min";
    nonceStore.reset();
    vi.mocked(findPlatformUserById).mockReset();
    vi.mocked(listPlatformMembershipsForUserInTenant).mockReset();
  });

  afterEach(() => {
    if (savedIdentity === undefined) delete process.env.PLATFORM_IDENTITY_ENABLED;
    else process.env.PLATFORM_IDENTITY_ENABLED = savedIdentity;
    if (savedSecret === undefined) delete process.env.PLATFORM_SSO_EXCHANGE_SECRET;
    else process.env.PLATFORM_SSO_EXCHANGE_SECRET = savedSecret;
  });

  it("mints and verifies audience-bound exchange token", () => {
    const token = createSsoExchangeToken({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-1",
      returnTo: "/admin",
      state: "state-abc",
    });
    expect(token).toBeTruthy();
    const verified = verifySsoExchangeToken(token);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.claims.audience).toBe("brightline");
      expect(verified.claims.issuer).toBe("mirotech");
      expect(verified.claims.userId).toBe("user-1");
    }
  });

  it("rejects expired exchange", () => {
    const token = createSsoExchangeToken({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-1",
      returnTo: "/admin",
      state: "state-abc",
      ttlSec: 30,
    });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 31_000);
    expect(verifySsoExchangeToken(token).ok).toBe(false);
    vi.useRealTimers();
  });

  it("redeems valid exchange and resolves staff", async () => {
    vi.mocked(findPlatformUserById).mockResolvedValue({
      id: "user-1",
      email: "ops@brightlinephotography.com",
      name: "Ops",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-1",
        userId: "user-1",
        tenantSlug: "brightline",
        role: "EDITOR",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const state = "csrf-state-1";
    const started = await service.startExchange({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-1",
      returnTo: "/admin/studio-cms",
      state,
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const token = new URL(started.redirectUrl).searchParams.get("token");
    expect(token).toBeTruthy();

    const redeemed = await service.redeemExchange({
      token: token!,
      state,
      expectedState: state,
      siteAudience: "brightline",
    });
    expect(redeemed.ok).toBe(true);
  });

  it("blocks replay of the same nonce", async () => {
    vi.mocked(findPlatformUserById).mockResolvedValue({
      id: "user-1",
      email: "ops@brightlinephotography.com",
      name: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([
      {
        id: "m-1",
        userId: "user-1",
        tenantSlug: "brightline",
        role: "VIEWER",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const state = "csrf-state-2";
    const started = await service.startExchange({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-1",
      returnTo: "/admin",
      state,
    });
    if (!started.ok) throw new Error("start failed");
    const token = new URL(started.redirectUrl).searchParams.get("token")!;

    const first = await service.redeemExchange({
      token,
      state,
      expectedState: state,
      siteAudience: "brightline",
    });
    expect(first.ok).toBe(true);

    const replay = await service.redeemExchange({
      token,
      state,
      expectedState: state,
      siteAudience: "brightline",
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.reason).toBe("replay");
  });

  it("rejects wrong audience on redeem site", async () => {
    const token = createSsoExchangeToken({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-1",
      returnTo: "/admin",
      state: "state-3",
    });
    const redeemed = await service.redeemExchange({
      token: token!,
      state: "state-3",
      expectedState: "state-3",
      siteAudience: "mirotech",
    });
    expect(redeemed.ok).toBe(false);
    if (!redeemed.ok) expect(redeemed.reason).toBe("wrong_audience");
  });

  it("rejects state mismatch", async () => {
    const token = createSsoExchangeToken({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-1",
      returnTo: "/admin",
      state: "state-4",
    });
    const redeemed = await service.redeemExchange({
      token: token!,
      state: "state-4",
      expectedState: "other-state",
      siteAudience: "brightline",
    });
    expect(redeemed.ok).toBe(false);
    if (!redeemed.ok) expect(redeemed.reason).toBe("state_mismatch");
  });

  it("rejects open redirect return paths", () => {
    expect(sanitizeSsoReturnPath("https://evil.example/phish", "brightline")).toBe("/admin");
    expect(sanitizeSsoReturnPath("/admin/studio-cms", "brightline")).toBe("/admin/studio-cms");
  });

  it("fails when user lacks membership in audience tenant", async () => {
    vi.mocked(findPlatformUserById).mockResolvedValue({
      id: "user-2",
      email: "ops@brightlinephotography.com",
      name: null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(listPlatformMembershipsForUserInTenant).mockResolvedValue([]);

    const state = "state-5";
    const started = await service.startExchange({
      issuer: "mirotech",
      audience: "brightline",
      userId: "user-2",
      returnTo: "/admin",
      state,
    });
    if (!started.ok) throw new Error("start failed");
    const token = new URL(started.redirectUrl).searchParams.get("token")!;

    const redeemed = await service.redeemExchange({
      token,
      state,
      expectedState: state,
      siteAudience: "brightline",
    });
    expect(redeemed.ok).toBe(false);
    if (!redeemed.ok) expect(redeemed.reason).toBe("missing_membership");
  });
});
