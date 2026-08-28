import "server-only";

import {
  headObject as r2HeadObject,
  signGet as r2SignGet,
  signPut as r2SignPut,
} from "@/lib/storage-r2";
import type { MediaProvider } from "@/lib/platform/media/media-provider";
import type {
  MediaHeadResult,
  MediaObjectRef,
  MediaSignedUpload,
  SignedMediaReadUrl,
} from "@/lib/platform/media/types";
import type { MediaProviderSignGetInput, MediaProviderSignPutInput } from "@/lib/platform/media/media-provider";
import { isNotFoundError, normalizeMediaError } from "@/lib/platform/media/normalize-error";
import { assertValidMediaObjectKey } from "@/lib/platform/media/validate-object-key";

const DEFAULT_EXPIRES_SECONDS = 3600;

/**
 * R2 adapter — delegates to lib/storage-r2 (single S3Client cache per vault).
 * Server-only; never import from client components.
 */
export class R2MediaProvider implements MediaProvider {
  async signPut(input: MediaProviderSignPutInput): Promise<MediaSignedUpload> {
    try {
      const objectKey = assertValidMediaObjectKey(input.object.objectKey);
      const result = await r2SignPut({
        key: objectKey,
        contentType: input.contentType,
        expiresIn: input.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS,
        access: input.access ?? "private",
        vault: input.object.vault,
      });
      return {
        kind: "signed-upload",
        uploadUrl: result.url,
        expiresInSeconds: result.expiresIn,
        headers: result.headers,
        object: { vault: input.object.vault, objectKey },
      };
    } catch (error) {
      throw normalizeMediaError(error, "signPut");
    }
  }

  async signGet(input: MediaProviderSignGetInput): Promise<SignedMediaReadUrl> {
    try {
      const objectKey = assertValidMediaObjectKey(input.object.objectKey);
      const result = await r2SignGet({
        key: objectKey,
        expiresIn: input.expiresInSeconds ?? DEFAULT_EXPIRES_SECONDS,
        vault: input.object.vault,
      });
      return {
        kind: "signed-read",
        url: result.url,
        expiresInSeconds: result.expiresIn,
      };
    } catch (error) {
      throw normalizeMediaError(error, "signGet");
    }
  }

  async headObject(object: MediaObjectRef): Promise<MediaHeadResult | null> {
    try {
      const objectKey = assertValidMediaObjectKey(object.objectKey);
      const result = await r2HeadObject(objectKey, object.vault);
      return {
        size: result.size,
        lastModified: result.lastModified,
        contentType: result.contentType,
      };
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw normalizeMediaError(error, "headObject");
    }
  }

  async exists(object: MediaObjectRef): Promise<boolean> {
    const head = await this.headObject(object);
    return head != null;
  }
}

export const r2MediaProvider = new R2MediaProvider();
