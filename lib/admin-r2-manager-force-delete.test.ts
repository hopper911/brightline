import { describe, expect, it } from "vitest";
import { forceDetachR2KeyDbOperations } from "./admin-r2-manager";

describe("forceDetachR2KeyDbOperations", () => {
  it("builds detach ops without nulling required storageKey fields", () => {
    const ops = forceDetachR2KeyDbOperations("site/backgrounds/full/test.mov");
    expect(ops.length).toBeGreaterThanOrEqual(18);
    const serialized = ops.map((op) => JSON.stringify(op)).join("\n");
    expect(serialized).not.toMatch(/"storageKey":null/);
  });
});
