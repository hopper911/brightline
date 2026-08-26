/** Web Response bodies must not rely on Node Buffer in all runtimes; copy into a Uint8Array. */
export function bufferToWebBody(buf: Uint8Array): Uint8Array {
  return Uint8Array.from(buf);
}
