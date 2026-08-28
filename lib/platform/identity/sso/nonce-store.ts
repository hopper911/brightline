import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ConsumeNonceInput = {
  nonce: string;
  audience: string;
  issuer: string;
  userId: string;
  expiresAt: Date;
};

export interface SsoNonceStore {
  consume(input: ConsumeNonceInput): Promise<boolean>;
}

/** In-memory store for tests and local dev without DB writes. */
export class MemorySsoNonceStore implements SsoNonceStore {
  private readonly seen = new Set<string>();

  async consume(input: ConsumeNonceInput): Promise<boolean> {
    if (this.seen.has(input.nonce)) return false;
    this.seen.add(input.nonce);
    return true;
  }

  reset(): void {
    this.seen.clear();
  }
}

export class PrismaSsoNonceStore implements SsoNonceStore {
  constructor(private readonly client: PrismaClient = prisma) {}

  async consume(input: ConsumeNonceInput): Promise<boolean> {
    try {
      await this.client.platformSsoExchangeNonce.create({
        data: {
          nonce: input.nonce,
          audience: input.audience,
          issuer: input.issuer,
          userId: input.userId,
          expiresAt: input.expiresAt,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const memorySsoNonceStore = new MemorySsoNonceStore();
export const prismaSsoNonceStore = new PrismaSsoNonceStore();

export function resolveSsoNonceStore(): SsoNonceStore {
  if (process.env.PLATFORM_SSO_NONCE_STORE === "memory") {
    return memorySsoNonceStore;
  }
  return prismaSsoNonceStore;
}
