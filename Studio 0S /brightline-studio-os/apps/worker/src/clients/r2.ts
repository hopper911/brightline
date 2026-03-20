import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getEnv } from "../lib/env";

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET } = getEnv();
  cachedClient = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<void> {
  const client = getClient();
  const { R2_BUCKET } = getEnv();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl ?? "public, max-age=31536000, immutable",
    })
  );
}

export function getPublicUrl(key: string): string {
  const { R2_PUBLIC_URL } = getEnv();
  return `${R2_PUBLIC_URL.replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

