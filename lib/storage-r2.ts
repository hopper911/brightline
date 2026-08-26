import type { Readable } from "node:stream";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import {
  getR2VaultCredentials,
  type R2VaultId,
} from "@/lib/r2-vaults";

const DEFAULT_EXPIRES_IN = 3600;
const PUBLIC_READ_HEADERS = { "x-amz-acl": "public-read" };

const clientCache = new Map<string, S3Client>();

function getR2Client(vault: R2VaultId = "brightline"): S3Client {
  const creds = getR2VaultCredentials(vault);
  const cacheKey = `${vault}:${creds.endpoint}:${creds.accessKeyId}:${creds.bucket}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;
  const client = new S3Client({
    region: creds.region,
    endpoint: creds.endpoint,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
  });
  clientCache.set(cacheKey, client);
  return client;
}

function getBucket(vault: R2VaultId = "brightline"): string {
  return getR2VaultCredentials(vault).bucket;
}

function cleanKey(key: string): string {
  return key.replace(/^\/+/, "");
}

export type SignPutOptions = {
  key: string;
  contentType?: string;
  expiresIn?: number;
  access?: "private" | "public-read";
  vault?: R2VaultId;
};

export type SignPutResult = { url: string; expiresIn: number; headers: Record<string, string> };

export async function signPut(options: SignPutOptions): Promise<SignPutResult> {
  const {
    key,
    contentType,
    expiresIn = DEFAULT_EXPIRES_IN,
    access = "private",
    vault = "brightline",
  } = options;
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const publicRead = access === "public-read";
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: cleanKey(key),
    ContentType: contentType ?? "application/octet-stream",
    ...(publicRead ? { ACL: "public-read" as const } : {}),
  });
  const url = await getSignedUrl(client, command, {
    expiresIn,
    ...(publicRead ? { unhoistableHeaders: new Set(["x-amz-acl"]) } : {}),
  });
  return { url, expiresIn, headers: publicRead ? PUBLIC_READ_HEADERS : {} };
}

export type SignGetOptions = {
  key: string;
  expiresIn?: number;
  vault?: R2VaultId;
};

export type SignGetResult = { url: string; expiresIn: number };

export async function signGet(options: SignGetOptions): Promise<SignGetResult> {
  const { key, expiresIn = DEFAULT_EXPIRES_IN, vault = "brightline" } = options;
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const command = new GetObjectCommand({ Bucket: bucket, Key: cleanKey(key) });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}

export type ListObjectsOptions = {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
  vault?: R2VaultId;
};

export type ListObjectsResult = {
  keys: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
};

export type R2ListedObject = {
  key: string;
  size: number;
  lastModified: string | null;
};

export async function listObjects(options: ListObjectsOptions): Promise<string[]> {
  const { prefix, maxKeys = 500, vault = "brightline" } = options;
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: cleanKey(prefix),
    MaxKeys: Math.min(maxKeys, 1000),
  });
  const response = await client.send(command);
  const keys =
    response.Contents?.map((obj) => obj.Key).filter((k): k is string => typeof k === "string") ?? [];
  return keys;
}

/** Flat listing (no delimiter) with sizes — for orphan/pair/summary scans. */
export async function listObjectsWithMeta(
  options: ListObjectsOptions
): Promise<{
  objects: R2ListedObject[];
  nextContinuationToken?: string;
  isTruncated: boolean;
}> {
  const { prefix, maxKeys = 500, continuationToken, vault = "brightline" } = options;
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: cleanKey(prefix),
      MaxKeys: Math.min(maxKeys, 1000),
      ContinuationToken: continuationToken || undefined,
    })
  );
  const objects: R2ListedObject[] =
    response.Contents?.flatMap((obj) => {
      if (!obj.Key || obj.Key.endsWith("/")) return [];
      return [
        {
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
        },
      ];
    }) ?? [];
  return {
    objects,
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: Boolean(response.IsTruncated),
  };
}

export type ListObjectsDelimitedOptions = {
  prefix: string;
  /** Pass `null`/`false` to list all keys under prefix (no CommonPrefixes). Default `"/"`. */
  delimiter?: string | null | false;
  maxKeys?: number;
  continuationToken?: string;
  vault?: R2VaultId;
};

export type ListObjectsDelimitedResult = {
  prefixes: string[];
  objects: R2ListedObject[];
  nextContinuationToken?: string;
  isTruncated: boolean;
};

/** Folder-style listing with CommonPrefixes (delimiter "/") plus object metadata. */
export async function listObjectsDelimited(
  options: ListObjectsDelimitedOptions
): Promise<ListObjectsDelimitedResult> {
  const { prefix, maxKeys = 500, continuationToken, vault = "brightline" } = options;
  const useDelimiter =
    options.delimiter === null || options.delimiter === false
      ? undefined
      : (options.delimiter ?? "/");
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: cleanKey(prefix),
      ...(useDelimiter ? { Delimiter: useDelimiter } : {}),
      MaxKeys: Math.min(maxKeys, 1000),
      ContinuationToken: continuationToken || undefined,
    })
  );

  const prefixes =
    response.CommonPrefixes?.map((p) => p.Prefix).filter(
      (p): p is string => typeof p === "string" && p.length > 0
    ) ?? [];

  const objects: R2ListedObject[] =
    response.Contents?.flatMap((obj) => {
      if (!obj.Key || obj.Key === cleanKey(prefix)) return [];
      if (obj.Key.endsWith("/") && (obj.Size ?? 0) === 0) return [];
      return [
        {
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
        },
      ];
    }) ?? [];

  return {
    prefixes,
    objects,
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: Boolean(response.IsTruncated),
  };
}

export type HeadObjectResult = {
  key: string;
  size: number;
  contentType: string | null;
  lastModified: string | null;
  etag: string | null;
};

export async function headObject(key: string, vault: R2VaultId = "brightline"): Promise<HeadObjectResult> {
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const normalized = cleanKey(key);
  const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: normalized }));
  return {
    key: normalized,
    size: response.ContentLength ?? 0,
    contentType: response.ContentType ?? null,
    lastModified: response.LastModified ? response.LastModified.toISOString() : null,
    etag: response.ETag ?? null,
  };
}

export async function copyObject(
  fromKey: string,
  toKey: string,
  vault: R2VaultId = "brightline"
): Promise<void> {
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const source = cleanKey(fromKey);
  const dest = cleanKey(toKey);
  if (source === dest) return;
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${source.split("/").map(encodeURIComponent).join("/")}`,
      Key: dest,
    })
  );
}

export async function deleteObject(key: string, vault: R2VaultId = "brightline"): Promise<void> {
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: cleanKey(key) }));
}

export async function deleteObjects(
  keys: string[],
  vault: R2VaultId = "brightline"
): Promise<{ deleted: string[]; errors: string[] }> {
  const unique = [...new Set(keys.map(cleanKey).filter(Boolean))];
  if (unique.length === 0) return { deleted: [], errors: [] };

  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const deleted: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < unique.length; i += 900) {
    const chunk = unique.slice(i, i + 900);
    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: false,
        },
      })
    );
    for (const d of response.Deleted ?? []) {
      if (d.Key) deleted.push(d.Key);
    }
    for (const e of response.Errors ?? []) {
      errors.push(`${e.Key ?? "?"}: ${e.Message ?? e.Code ?? "delete failed"}`);
    }
  }

  return { deleted, errors };
}

/** Copy then delete (rename/move). */
export async function moveObject(
  fromKey: string,
  toKey: string,
  vault: R2VaultId = "brightline"
): Promise<void> {
  const source = cleanKey(fromKey);
  const dest = cleanKey(toKey);
  if (source === dest) return;
  await copyObject(source, dest, vault);
  await deleteObject(source, vault);
}

export type PutObjectBufferOptions = {
  key: string;
  body: Buffer;
  contentType: string;
  access?: "private" | "public-read";
  vault?: R2VaultId;
};

/** Server-side upload (e.g. multipart → R2). */
export async function putObjectBuffer(options: PutObjectBufferOptions): Promise<void> {
  const { key, body, contentType, access = "private", vault = "brightline" } = options;
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: cleanKey(key),
      Body: body,
      ContentType: contentType,
      ...(access === "public-read" ? { ACL: "public-read" as const } : {}),
    })
  );
}

/** Start an R2 multipart upload (for large files chunked through our API under Vercel’s 4.5MB limit). */
export async function createMultipartUpload(options: {
  key: string;
  contentType: string;
  vault?: R2VaultId;
}): Promise<{ uploadId: string; key: string }> {
  const vault = options.vault ?? "brightline";
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const key = cleanKey(options.key);
  const res = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options.contentType || "application/octet-stream",
    })
  );
  if (!res.UploadId) throw new Error("R2 did not return an upload id.");
  return { uploadId: res.UploadId, key };
}

export async function uploadMultipartPart(options: {
  key: string;
  uploadId: string;
  partNumber: number;
  body: Buffer;
  vault?: R2VaultId;
}): Promise<{ etag: string; partNumber: number }> {
  const vault = options.vault ?? "brightline";
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const res = await client.send(
    new UploadPartCommand({
      Bucket: bucket,
      Key: cleanKey(options.key),
      UploadId: options.uploadId,
      PartNumber: options.partNumber,
      Body: options.body,
    })
  );
  if (!res.ETag) throw new Error(`R2 part ${options.partNumber} missing ETag.`);
  return { etag: res.ETag, partNumber: options.partNumber };
}

export async function completeMultipartUpload(options: {
  key: string;
  uploadId: string;
  parts: Array<{ etag: string; partNumber: number }>;
  vault?: R2VaultId;
}): Promise<void> {
  const vault = options.vault ?? "brightline";
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: cleanKey(options.key),
      UploadId: options.uploadId,
      MultipartUpload: {
        Parts: options.parts
          .slice()
          .sort((a, b) => a.partNumber - b.partNumber)
          .map((p) => ({ ETag: p.etag, PartNumber: p.partNumber })),
      },
    })
  );
}

export async function abortMultipartUpload(options: {
  key: string;
  uploadId: string;
  vault?: R2VaultId;
}): Promise<void> {
  const vault = options.vault ?? "brightline";
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: cleanKey(options.key),
      UploadId: options.uploadId,
    })
  );
}

export async function getObjectBuffer(
  key: string,
  vault: R2VaultId = "brightline"
): Promise<Buffer> {
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: cleanKey(key) }));
  const body = response.Body;
  if (!body) throw new Error("R2 object body was empty.");
  const bytes = await body.transformToByteArray();
  return Buffer.from(bytes);
}

/** Stream bytes from R2 (Node readable) for piping into ZIP, etc. */
export async function getObjectReadable(
  key: string,
  vault: R2VaultId = "brightline"
): Promise<Readable> {
  const client = getR2Client(vault);
  const bucket = getBucket(vault);
  const normalized = cleanKey(key);
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: normalized }));
  const body = response.Body;
  if (!body) throw new Error("R2 object body was empty.");
  return body as Readable;
}
