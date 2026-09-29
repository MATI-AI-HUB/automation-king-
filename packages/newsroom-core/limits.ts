export const MAX_RESPONSE_BYTES = 2_000_000;
export const FETCH_TIMEOUT_MS = 10_000;

export function assertResponseSize(bytes: number, max = MAX_RESPONSE_BYTES): void {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error('invalid_size');
  if (bytes > max) throw new Error('response_too_large');
}

export function capBuffer(buf: Uint8Array, max = MAX_RESPONSE_BYTES): Uint8Array {
  if (buf.byteLength > max) throw new Error('response_too_large');
  return buf;
}
