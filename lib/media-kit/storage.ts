import { putObjectBuffer } from "@/lib/storage-r2";

export type MediaKitSource = "blog" | "work";

export function mediaKitPrefix(source: MediaKitSource, entityId: string) {
  const safeSource = source === "work" ? "work" : "blog";
  const safeId = entityId.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "item";
  return `site/media-kits/${safeSource}/${safeId}`;
}

export async function putMediaKitObject(options: {
  source: MediaKitSource;
  entityId: string;
  filename: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  const key = `${mediaKitPrefix(options.source, options.entityId)}/${options.filename}`;
  await putObjectBuffer({
    key,
    body: options.body,
    contentType: options.contentType,
    access: "private",
  });
  return key;
}
