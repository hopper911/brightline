import { AwsClient } from "aws4fetch";
import { mergeParentDotenvIntoProcess } from "@/lib/merge-parent-dotenv";

const DEFAULT_EXPIRES_IN = 3600;

function decodeXmlEntity(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeCredential(value: string | undefined): string {
  if (value == null || typeof value !== "string") return "";
  return value
    .replace(/\r\n|\r|\n/g, "")
    .replace(/[\u201C\u201D\u2018\u2019]/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function encodeR2Key(key: string) {
  return key
    .replace(/^\/+/, "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getR2Config() {
  mergeParentDotenvIntoProcess();
  const endpoint = normalizeCredential(process.env.R2_ENDPOINT).replace(/\/$/, "");
  const region = process.env.R2_REGION || "auto";
  const accessKeyId = normalizeCredential(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = normalizeCredential(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = normalizeCredential(process.env.R2_BUCKET).replace(/\/$/, "");

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 credentials not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)."
    );
  }

  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

export async function signPublicR2Get({
  key,
  expiresIn = DEFAULT_EXPIRES_IN,
}: {
  key: string;
  expiresIn?: number;
}) {
  const { endpoint, region, accessKeyId, secretAccessKey, bucket } = getR2Config();
  const url = new URL(`${endpoint}/${bucket}/${encodeR2Key(key)}`);
  url.searchParams.set("X-Amz-Expires", String(expiresIn));

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region,
  });
  const signed = await client.sign(url.toString(), {
    method: "GET",
    aws: { signQuery: true },
  });

  return { url: signed.url, expiresIn };
}

export async function listPublicR2Objects({
  prefix,
  maxKeys = 500,
  continuationToken,
}: {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
}) {
  const { endpoint, region, accessKeyId, secretAccessKey, bucket } = getR2Config();
  const url = new URL(`${endpoint}/${bucket}`);
  url.searchParams.set("list-type", "2");
  url.searchParams.set("prefix", prefix.replace(/^\/+/, ""));
  url.searchParams.set("max-keys", String(Math.min(maxKeys, 1000)));
  if (continuationToken) {
    url.searchParams.set("continuation-token", continuationToken);
  }

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region,
  });
  const signed = await client.sign(url.toString(), { method: "GET" });
  const response = await fetch(signed);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`R2 list failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return [...body.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((match) =>
    decodeXmlEntity(match[1] ?? "")
  );
}
