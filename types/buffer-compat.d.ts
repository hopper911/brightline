export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Node Buffer compat shim
  interface Buffer extends Uint8Array<ArrayBufferLike> {}
}
