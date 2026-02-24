import { signDownloadUrl, signUploadUrl } from "@/lib/storage";

type ClientDownloadOpts = {
  key: string;
  expiresIn?: number;
};

type MarketingUploadOpts = {
  key: string;
  contentType?: string;
  expiresIn?: number;
};

export async function getClientDownloadUrl(opts: ClientDownloadOpts) {
  const result = await signDownloadUrl({
    key: opts.key,
    expiresIn: opts.expiresIn,
  });
  return { url: result.url, expiresIn: result.expiresIn };
}

export async function getMarketingUploadUrl(opts: MarketingUploadOpts) {
  const result = await signUploadUrl({
    key: opts.key,
    contentType: opts.contentType,
    expiresIn: opts.expiresIn,
  });
  return { url: result.url };
}
