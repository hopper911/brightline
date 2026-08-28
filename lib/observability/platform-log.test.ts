import { afterEach, describe, expect, it, vi } from "vitest";
import { platformLog } from "@/lib/observability/platform-log";

describe("platformLog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits single JSON line with required fields", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    platformLog({
      severity: "info",
      service: "platform",
      action: "test.action",
      message: "hello",
      tenant: "brightline",
      requestId: "req-1",
    });

    expect(spy).toHaveBeenCalledOnce();
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.severity).toBe("info");
    expect(parsed.service).toBe("platform");
    expect(parsed.action).toBe("test.action");
    expect(parsed.message).toBe("hello");
    expect(parsed.tenant).toBe("brightline");
    expect(parsed.requestId).toBe("req-1");
    expect(parsed.ts).toBeTruthy();
  });

  it("redacts secrets in meta", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    platformLog({
      severity: "warn",
      service: "identity",
      action: "identity.sso.failed",
      meta: { token: "sso1.secret", reason: "invalid" },
    });

    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.token).toBe("[REDACTED]");
    expect(parsed.reason).toBe("invalid");
  });
});
