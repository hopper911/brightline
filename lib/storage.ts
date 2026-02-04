type SignedUrlOptions = {
  key: string;
  contentType?: string;
  cacheControl?: string;
  expiresIn?: number;
  metadata?: Record<string, string>;
};

type SignedDownloadOptions = {
  key: string;
  expiresIn?: number;
  responseContentType?: string;
  responseCacheControl?: string;
  responseContentDisposition?: string;
};

type SignedUrlResult = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
};

function ensureStorageConfigured() {
  const hasR2 =
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID);
  const hasS3 =
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET &&
    process.env.S3_REGION;

  if (!hasR2 && !hasS3) {
    throw new Error(
      "Storage is not configured. Set R2_* or S3_* environment variables."
    );
  }
}

export async function getSignedUploadUrl(
  _options: SignedUrlOptions
): Promise<SignedUrlResult> {
  ensureStorageConfigured();

  const {
    S3Client,
    PutObjectCommand,
  } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  const accessKeyId =
    process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined) ||
    (process.env.S3_ENDPOINT || undefined);

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage credentials are missing.");
  }

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: _options.key,
    ContentType: _options.contentType || "application/octet-stream",
    CacheControl: _options.cacheControl || "public, max-age=31536000, immutable",
    Metadata: _options.metadata,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: _options.expiresIn ?? 60 * 10,
  });

  return { url, method: "PUT", headers: { "Content-Type": _options.contentType || "application/octet-stream" } };
}

export async function getSignedDownloadUrl(
  _options: SignedDownloadOptions
): Promise<SignedUrlResult> {
  ensureStorageConfigured();
  throw new Error("Signed download URLs are not configured yet.");
}

export function getPublicUrl(key: string) {
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL;
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  const endpoint =
    process.env.R2_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined) ||
    process.env.S3_ENDPOINT ||
    undefined;

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }

  if (!endpoint || !bucket) {
    throw new Error("Missing public storage endpoint.");
  }

  return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
}
