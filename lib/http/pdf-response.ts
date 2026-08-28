/** Web Response bodies must not rely on Node Buffer in all runtimes; copy into a Uint8Array. */
export function bufferToWebBody(buf: Buffer | Uint8Array): BodyInit {
  return Uint8Array.from(buf) as BodyInit;
}
