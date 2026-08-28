import { describe, expect, it } from "vitest";
import { mapMirotechJournalSyncToPublishResult } from "@/lib/platform/publishing/integrations/map-mirotech-publish-result";

const baseRequest = {
  source: { tenant: "brightline" as const, type: "blog-post" as const, id: "post-1" },
  target: "mirotech-site" as const,
  operation: "sync" as const,
};

describe("mapMirotechJournalSyncToPublishResult", () => {
  it("maps successful sync to completed result with resourceId", () => {
    const result = mapMirotechJournalSyncToPublishResult(baseRequest, {
      postId: "post-1",
      ok: true,
      mirotechJournalId: "journal-99",
    });
    expect(result.outcome).toBe("completed");
    expect(result.resourceId).toBe("journal-99");
    expect(result.effects?.[0]).toMatchObject({
      kind: "remote_api",
      target: "mirotech-site",
    });
  });

  it("maps failed sync to failed result without throwing", () => {
    const result = mapMirotechJournalSyncToPublishResult(baseRequest, {
      postId: "post-1",
      ok: false,
      error: "Remote rejected",
    });
    expect(result.outcome).toBe("failed");
    expect(result.errorCode).toBe("remote_failed");
    expect(result.message).toBe("Remote rejected");
  });
});
