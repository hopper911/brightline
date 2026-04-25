import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { mergeParentDotenvIntoProcess } from "@/lib/merge-parent-dotenv";

const DEFAULT_EXPIRES_IN = 3600;
const PUBLIC_READ_HEADERS = { "x-amz-acl": "public-read" };

function normalizeCredential(value: string | undefined): string {
  if (value == null || typeof value !== "string") return "";
  return value
    .replace(/\r\n|\r|\n/g, "")
    .replace(/[\u201C\u201D\u2018\u2019]/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function getR2Client(): S3Client {
  mergeParentDotenvIntoProcess();
  const endpoint = normalizeCredential(process.env.R2_ENDPOINT);
  const region = process.env.R2_REGION || "auto";
  const accessKeyId = normalizeCredential(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = normalizeCredential(process.env.R2_SECRET_ACCESS_KEY);
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).");
  }
  return new S3Client({
    region,
    endpoint: endpoint.replace(/\/$/, ""),
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = normalizeCredential(process.env.R2_BUCKET);
  if (!bucket) throw new Error("R2_BUCKET not set.");
  return bucket.replace(/\/$/, "");
}

export type SignPutOptions = {
  key: string;
  contentType?: string;
  expiresIn?: number;
  access?: "private" | "public-read";
};

export type SignPutResult = { url: string; expiresIn: number; headers: Record<string, string> };

export async function signPut(options: SignPutOptions): Promise<SignPutResult> {
  const { key, contentType, expiresIn = DEFAULT_EXPIRES_IN, access = "private" } = options;
  const client = getR2Client();
  const bucket = getBucket();
  const publicRead = access === "public-read";
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
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
};

export type SignGetResult = { url: string; expiresIn: number };

export async function signGet(options: SignGetOptions): Promise<SignGetResult> {
  const { key, expiresIn = DEFAULT_EXPIRES_IN } = options;
  const client = getR2Client();
  const bucket = getBucket();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}

export type ListObjectsOptions = {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
};

export type ListObjectsResult = {
  keys: string[];
  nextContinuationToken?: string;
  isTruncated: boolean;
};

export async function listObjects(options: ListObjectsOptions): Promise<string[]> {
  const { prefix, maxKeys = 500 } = options;
  const client = getR2Client();
  const bucket = getBucket();
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix.replace(/^\//, ""),
    MaxKeys: Math.min(maxKeys, 1000),
  });
  const response = await client.send(command);
  const keys =
    response.Contents?.map((obj) => obj.Key).filter((k): k is string => typeof k === "string") ?? [];
  return keys;
}

export type PutObjectBufferOptions = {
  key: string;
  body: Buffer;
  contentType: string;
  access?: "private" | "public-read";
};

/** Server-side upload (e.g. multipart → R2). */
export async function putObjectBuffer(options: PutObjectBufferOptions): Promise<void> {
  const { key, body, contentType, access = "private" } = options;
  const client = getR2Client();
  const bucket = getBucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key.replace(/^\//, ""),
      Body: body,
      ContentType: contentType,
      ...(access === "public-read" ? { ACL: "public-read" as const } : {}),
    })
  );
}

