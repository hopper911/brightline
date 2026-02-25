import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";

const DEFAULT_EXPIRES_IN = 3600;

function getR2Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const region = process.env.R2_REGION || "auto";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
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
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set.");
  return bucket.replace(/\/$/, "");
}

export type SignPutOptions = {
  key: string;
  contentType?: string;
  expiresIn?: number;
};

export type SignPutResult = { url: string; expiresIn: number };

export async function signPut(options: SignPutOptions): Promise<SignPutResult> {
  const { key, contentType, expiresIn = DEFAULT_EXPIRES_IN } = options;
  const client = getR2Client();
  const bucket = getBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType ?? "application/octet-stream",
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return { url, expiresIn };
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
