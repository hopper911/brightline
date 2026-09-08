import { createHash, timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

/** Normalize Node Buffer for crypto APIs under strict TS Buffer/Uint8Array typing. */
export function bufferToUint8Array(buf: Buffer): Uint8Array {
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  return nodeTimingSafeEqual(bufferToUint8Array(a), bufferToUint8Array(b));
}

/**
 * Compare untrusted vs expected secrets without leaking length via early-return.
 * SHA-256 both sides first so the equality check always runs on 32-byte digests.
 */
export function timingSafeUtf8Equal(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function concatNodeBuffers(buffers: readonly Buffer[]): Buffer {
  return Buffer.concat(buffers as unknown as readonly Uint8Array[]);
}

export function concatTwoBuffers(a: Buffer, b: Buffer): Buffer {
  return Buffer.concat([a, b] as unknown as readonly Uint8Array[]);
}

export function bufferFromSlice(source: Buffer, start: number, end?: number): Buffer {
  return Buffer.from(bufferToUint8Array(source.subarray(start, end)));
}

export function bufferAsBodyInit(buf: Buffer): BodyInit {
  return bufferToUint8Array(buf) as BodyInit;
}
