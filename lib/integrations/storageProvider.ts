import { signDownloadUrl, signUploadUrl } from "@/lib/storage";

export type StorageSignUploadInput = {
  key: string;
  contentType?: string;
  expiresIn?: number;
};

export type StorageSignDownloadInput = {
  key: string;
  expiresIn?: number;
};

export type SignedStorageUrl = {
  url: string;
  expiresIn: number;
};

export type StorageProvider = {
  name: string;
  signUpload(input: StorageSignUploadInput): Promise<SignedStorageUrl>;
  signDownload(input: StorageSignDownloadInput): Promise<SignedStorageUrl>;
};

export const r2StorageProvider: StorageProvider = {
  name: "r2",
  signUpload: signUploadUrl,
  signDownload: signDownloadUrl,
};

export function getStorageProvider(): StorageProvider {
  return r2StorageProvider;
}
