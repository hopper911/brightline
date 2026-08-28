/**
 * Infrastructure media provider — wraps S3/R2 client (Phase 3B implementation).
 * Application code should depend on MediaService, not MediaProvider directly.
 */

import type {
  MediaHeadResult,
  MediaObjectRef,
  MediaSignedUpload,
  SignedMediaReadUrl,
} from "@/lib/platform/media/types";

export type MediaProviderSignPutInput = {
  object: MediaObjectRef;
  contentType: string;
  expiresInSeconds?: number;
  access?: "private" | "public-read";
};

export type MediaProviderSignGetInput = {
  object: MediaObjectRef;
  expiresInSeconds?: number;
};

/** Low-level storage adapter boundary (R2MediaProvider in Phase 3B). */
export interface MediaProvider {
  signPut(input: MediaProviderSignPutInput): Promise<MediaSignedUpload>;
  signGet(input: MediaProviderSignGetInput): Promise<SignedMediaReadUrl>;
  headObject(object: MediaObjectRef): Promise<MediaHeadResult | null>;
  exists(object: MediaObjectRef): Promise<boolean>;
}
