import { timingSafeEqual } from "node:crypto";

export type UploadTokenFailure = "unconfigured" | "unauthorized";

/**
 * Returns null when `provided` matches `UPLOAD_TOKEN`.
 * `unconfigured` means the env var is missing. `unauthorized` means the secret did not match.
 */
export function checkUploadToken(provided: string | null | undefined): UploadTokenFailure | null {
  const expected = process.env.UPLOAD_TOKEN;
  if (!expected) {
    return "unconfigured";
  }
  if (!provided || !tokensEqual(provided, expected)) {
    return "unauthorized";
  }
  return null;
}

function tokensEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Compare against itself so timing does not leak length via early return alone.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
