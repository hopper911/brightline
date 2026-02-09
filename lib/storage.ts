import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type SignParams = {
  key: string;
  contentType?: string;
  expiresIn?: number;
};

function assertStorageEnv() {
  const useR2 = Boolean(process.env.R2_BUCKET);
  if (useR2) {
    const required = [
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
      "R2_ENDPOINT",
    ];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Missing storage env vars: ${missing.join(", ")}`);
    }
    return "r2";
  }

  const required = ["S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_BUCKET", "S3_REGION"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing storage env vars: ${missing.join(", ")}`);
  }
  return "s3";
}

function getStorageConfig() {
  const mode = assertStorageEnv();
  const useR2 = mode === "r2";
  if (useR2) {
    return {
      region: process.env.R2_REGION || "auto",
      bucket: process.env.R2_BUCKET as string,
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
      forcePathStyle: true,
    };
  }

  return {
    region: process.env.S3_REGION as string,
    bucket: process.env.S3_BUCKET as string,
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  };
}

function getClient() {
  const config = getStorageConfig();
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials,
    forcePathStyle: config.forcePathStyle,
  });
}

export async function signUploadUrl({ key, contentType, expiresIn }: SignParams) {
  const config = getStorageConfig();
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: expiresIn || 60 * 10,
  });
  return { url, key, expiresIn: expiresIn || 60 * 10 };
}

export async function signDownloadUrl({ key, expiresIn }: SignParams) {
  const config = getStorageConfig();
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });
  const url = await getSignedUrl(client, command, {
    expiresIn: expiresIn || 60 * 10,
  });
  return { url, key, expiresIn: expiresIn || 60 * 10 };
}

export function getPublicUrl(key: string) {
  const useR2 = Boolean(process.env.R2_BUCKET);
  if (useR2 && process.env.R2_ENDPOINT && process.env.R2_BUCKET) {
    return `${process.env.R2_ENDPOINT.replace(/\/$/, "")}/${process.env.R2_BUCKET}/${key}`;
  }
  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, "")}/${process.env.S3_BUCKET}/${key}`;
  }
  return key;
}
