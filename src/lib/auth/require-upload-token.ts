import { timingSafeEqual } from "node:crypto";

/**
 * Returns null when the request is authorized.
 * Returns a 401 Response when the Bearer token is missing or invalid.
 */
export function requireUploadToken(request: Request): Response | null {
  const expected = process.env.UPLOAD_TOKEN;
  if (!expected) {
    return new Response(JSON.stringify({ error: "Upload is not configured" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return unauthorized();
  }

  const provided = header.slice("Bearer ".length);
  if (!tokensEqual(provided, expected)) {
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
