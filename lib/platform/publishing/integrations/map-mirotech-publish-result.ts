import type { MirotechJournalSyncResult } from "@/lib/platform/publishing/mirotech/journal-ingest";
import type { PublishRequest, PublishResult } from "@/lib/platform/publishing/types";
import { MIROTECH_JOURNAL_INGEST_PATH } from "@/lib/platform/publishing/integrations/mirotech-publishing-port";

export function mapMirotechJournalSyncToPublishResult(
  request: PublishRequest,
  sync: MirotechJournalSyncResult
): PublishResult {
  if (sync.ok) {
    return {
      outcome: "completed",
      request,
      resourceId: sync.mirotechJournalId || null,
      message: "Mirotech journal sync completed.",
      effects: [
        {
          kind: "remote_api",
          target: "mirotech-site",
          path: MIROTECH_JOURNAL_INGEST_PATH,
          status: 200,
        },
      ],
    };
  }

  return {
    outcome: "failed",
    request,
    resourceId: sync.mirotechJournalId ?? null,
    message: sync.error || "Mirotech journal sync failed.",
    errorCode: "remote_failed",
    effects: [
      {
        kind: "remote_api",
        target: "mirotech-site",
        path: MIROTECH_JOURNAL_INGEST_PATH,
        status: 502,
      },
    ],
  };
}
