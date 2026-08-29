import { describe, expect, it } from "vitest";
import {
  auditResourceTypeForProjectRef,
  encodeStudioProjectRefParam,
  parseStudioProjectRefParam,
} from "@/lib/studio/projects/project-ref";

describe("studio project ref", () => {
  it("round-trips content ref in URL param", () => {
    const ref = { tenant: "brightline" as const, type: "work-project" as const, id: "abc-123" };
    const param = encodeStudioProjectRefParam(ref);
    expect(parseStudioProjectRefParam(param)).toEqual(ref);
  });

  it("maps audit resource types", () => {
    expect(
      auditResourceTypeForProjectRef({
        tenant: "brightline",
        type: "work-project",
        id: "x",
      })
    ).toBe("work-project");
    expect(
      auditResourceTypeForProjectRef({
        tenant: "mirotech",
        type: "mirotech-case-study",
        id: "x",
      })
    ).toBe("dual-brand-work");
  });
});
