export {};

declare global {
  interface Buffer extends Uint8Array<ArrayBufferLike> {}
}
