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
    process.env.R2_ENDPOINT;
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
  throw new Error("Signed upload URLs are not configured yet.");
}

export async function getSignedDownloadUrl(
  _options: SignedDownloadOptions
): Promise<SignedUrlResult> {
  ensureStorageConfigured();
  throw new Error("Signed download URLs are not configured yet.");
}
