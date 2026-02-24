import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type SignedDownloadOptions = {
  key: string;
  expiresIn?: number;
};

type SignedUploadOptions = {
  key: string;
  contentType?: string;
  expiresIn?: number;
};

type SignedResult = {
  url: string;
  expiresIn?: number;
};

function getS3Client(): S3Client | null {
  const useR2 =
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET &&
    process.env.R2_ENDPOINT;
  const useS3 =
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET &&
    process.env.S3_REGION;

  if (useR2) {
    return new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  if (useS3) {
    return new S3Client({
      region: process.env.S3_REGION!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return null;
}

function getBucket(): string {
  return process.env.R2_BUCKET || process.env.S3_BUCKET || "";
}

export async function signDownloadUrl(
  opts: SignedDownloadOptions
): Promise<SignedResult> {
  const client = getS3Client();
  const bucket = getBucket();
  if (!client || !bucket) {
    throw new Error("Missing storage env vars. Set R2_* or S3_* environment variables.");
  }
  const expiresIn = opts.expiresIn ?? 3600;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: opts.key,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}

export async function signUploadUrl(
  opts: SignedUploadOptions
): Promise<SignedResult> {
  const client = getS3Client();
  const bucket = getBucket();
  if (!client || !bucket) {
    throw new Error("Missing storage env vars. Set R2_* or S3_* environment variables.");
  }
  const expiresIn = opts.expiresIn ?? 3600;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: opts.key,
    ContentType: opts.contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
}
