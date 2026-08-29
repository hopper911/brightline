import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mockCreate = vi.fn();
const mockResolveContext = vi.fn();
const mockAuthorize = vi.fn();
const mockSubject = vi.fn();

vi.mock("@/lib/admin-auth", () => ({
  authorizeAdminRequest: (...args: unknown[]) => mockAuthorize(...args),
}));

vi.mock("@/lib/studio/ops/resolve-context", () => ({
  resolveStudioOpsContext: (...args: unknown[]) => mockResolveContext(...args),
}));

vi.mock("@/lib/studio/projects/resolve-subject", () => ({
  resolveStudioAuthorizationSubject: (...args: unknown[]) => mockSubject(...args),
}));

vi.mock("@/lib/platform/projects/server", () => ({
  defaultProjectWorkflowService: {
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

import { POST } from "@/app/api/studio/projects/route";
import { ProjectSlugConflictError } from "@/lib/platform/projects/errors";

describe("POST /api/studio/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorize.mockResolvedValue(true);
    mockResolveContext.mockResolvedValue({
      subjectKind: "legacy_admin",
      memberships: [
        { tenantSlug: "brightline", role: "OWNER" },
        { tenantSlug: "mirotech", role: "OWNER" },
      ],
      permissions: [],
      activeTenant: "brightline",
    });
    mockSubject.mockResolvedValue({ kind: "legacy_admin" });
    mockCreate.mockResolvedValue({
      id: "new-1",
      slug: "glass-tower",
      lifecycle: "DRAFT",
      completeness: { complete: false, score: 20, missing: ["hero asset"], warnings: [] },
      ref: { tenant: "brightline", type: "work-project", id: "new-1" },
    });
  });

  it("creates project through workflow service", async () => {
    const req = new Request("http://localhost/api/studio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant: "brightline", title: "Glass Tower" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.project.editHref).toBe("/admin/work/new-1");
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("returns 409 on slug conflict", async () => {
    mockCreate.mockRejectedValue(new ProjectSlugConflictError("glass-tower"));
    const req = new Request("http://localhost/api/studio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant: "brightline", title: "Glass Tower" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("requires title", async () => {
    const req = new Request("http://localhost/api/studio/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant: "brightline" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
