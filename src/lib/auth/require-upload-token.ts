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

/**
 * Returns null when the request is authorized.
 * Returns a 401 Response when the Bearer token is missing or invalid.
 */
export function requireUploadToken(request: Request): Response | null {
  const header = request.headers.get("authorization");
  const provided = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  const failure = checkUploadToken(provided);
  if (failure === "unconfigured") {
    return new Response(JSON.stringify({ error: "Upload is not configured" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (failure === "unauthorized") {
    return unauthorized();
  }
  return null;
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
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
