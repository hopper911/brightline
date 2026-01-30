import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_EXPIRES = 60 * 10;

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("R2 credentials are missing.");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

function getBucket() {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET is missing.");
  return bucket;
}

export async function signPut({
  key,
  contentType,
  expiresIn = DEFAULT_EXPIRES,
  cacheControl = "private, max-age=0, no-store",
}: {
  key: string;
  contentType?: string;
  expiresIn?: number;
  cacheControl?: string;
}) {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    CacheControl: cacheControl,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, key, expiresIn };
}

export async function signGet({
  key,
  expiresIn = DEFAULT_EXPIRES,
  responseCacheControl = "private, max-age=0, no-store",
}: {
  key: string;
  expiresIn?: number;
  responseCacheControl?: string;
}) {
  const client = getR2Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseCacheControl: responseCacheControl,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, key, expiresIn };
}
