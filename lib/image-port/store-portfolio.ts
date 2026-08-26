import {
  encodePortfolioWebpPair,
  formatPortfolioStem,
  maxSeqFromKeys,
  portfolioKeysForStem,
  yyMmDdUtc,
} from "@/lib/image-port/encode-webp";
import { deleteObject, listObjects, putObjectBuffer } from "@/lib/storage-r2";
import type { T9MediaRoot } from "@/lib/t9-media-root";

export type StoredPortfolioWebp = {
  segment: string;
  root: T9MediaRoot;
  stem: string;
  fullKey: string;
  thumbKey: string;
  previewUrl: string;
};

export async function storePortfolioWebpFromBuffer(
  source: Buffer,
  segment: string,
  tempKeyToDelete?: string,
  root: T9MediaRoot = "portfolio"
): Promise<StoredPortfolioWebp> {
  let full: Buffer;
  let thumb: Buffer;
  try {
    const encoded = await encodePortfolioWebpPair(source);
    full = encoded.full;
    thumb = encoded.thumb;
  } catch (err) {
    if (tempKeyToDelete) {
      try {
        await deleteObject(tempKeyToDelete);
      } catch {
        /* ignore */
      }
    }
    throw Object.assign(new Error("Could not convert image."), { status: 422, cause: err });
  }

  const yymmdd = yyMmDdUtc();
  const listPrefix = `${root}/${segment}/web_full/${segment}-${yymmdd}-`;
  let existing: string[] = [];
  try {
    existing = await listObjects({ prefix: listPrefix, maxKeys: 1000 });
  } catch (err) {
    console.error("IMAGE_PORT_LIST_SEQ_ERROR", err);
  }
  const nextSeq = maxSeqFromKeys(existing, segment, yymmdd, root) + 1;
  const stem = formatPortfolioStem(segment, yymmdd, nextSeq);
  const { fullKey, thumbKey } = portfolioKeysForStem(segment, stem, root);

  try {
    await putObjectBuffer({
      key: fullKey,
      body: full,
      contentType: "image/webp",
      access: "public-read",
    });
    await putObjectBuffer({
      key: thumbKey,
      body: thumb,
      contentType: "image/webp",
      access: "public-read",
    });
  } catch (err) {
    if (tempKeyToDelete) {
      try {
        await deleteObject(tempKeyToDelete);
      } catch {
        /* ignore */
      }
    }
    throw Object.assign(new Error("Could not store WebP."), { status: 502, cause: err });
  }

  return {
    segment,
    root,
    stem,
    fullKey,
    thumbKey,
    previewUrl: `/api/media/public?key=${encodeURIComponent(thumbKey)}`,
  };
}
