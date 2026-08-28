import type { AssetBackfillCollectionResult, AssetBackfillSource } from "@/lib/platform/assets/backfill/types";
import { collectBrightlinePortfolioCandidates } from "@/lib/platform/assets/backfill/sources/brightline-portfolio";
import type { PrismaClient } from "@prisma/client";

export type CollectBackfillCandidatesInput = {
  source: AssetBackfillSource;
  limit?: number;
  cursor?: string;
  recordId?: string;
};

export async function collectBackfillCandidates(
  input: CollectBackfillCandidatesInput,
  client?: PrismaClient
): Promise<AssetBackfillCollectionResult> {
  switch (input.source) {
    case "brightline-portfolio":
      return collectBrightlinePortfolioCandidates(
        {
          limit: input.limit,
          cursor: input.cursor,
          recordId: input.recordId,
        },
        client
      );
    default: {
      const _exhaustive: never = input.source;
      throw new Error(`Unsupported backfill source: ${_exhaustive}`);
    }
  }
}
