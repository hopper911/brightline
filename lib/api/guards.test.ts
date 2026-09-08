import { afterEach, describe, expect, it } from "vitest";
import { guardCronBearer } from "@/lib/api/guards";

describe("guardCronBearer", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it("fails closed when CRON_SECRET is missing", () => {
    delete process.env.CRON_SECRET;
    const res = guardCronBearer(new Request("https://brightlinephotography.com/api/cron/followups"));
    expect(res?.status).toBe(401);
  });

  it("rejects missing, wrong, and length-mismatched bearers", async () => {
    process.env.CRON_SECRET = "cron-secret-value";
    const url = "https://brightlinephotography.com/api/cron/followups";
    expect(guardCronBearer(new Request(url))?.status).toBe(401);
    expect(
      guardCronBearer(new Request(url, { headers: { authorization: "Bearer nope" } }))?.status
    ).toBe(401);
    expect(
      guardCronBearer(
        new Request(url, { headers: { authorization: "Bearer cron-secret-value-extra" } })
      )?.status
    ).toBe(401);
    expect(
      guardCronBearer(new Request(url, { headers: { authorization: "Bearer cron-secret-value" } }))
    ).toBeNull();
  });
});
