import { z } from "zod";
import { requireUploadToken } from "@/lib/auth/require-upload-token";
import { UploadConflictError, uploadTournamentTrf } from "@/lib/db/writes/upload-tournament-trf";
import { parseTrf, TrfParseError } from "@/lib/trf/parse";

export const runtime = "nodejs";

const bodySchema = z.string().trim().min(1, "TRF body must not be empty");

export async function POST(request: Request): Promise<Response> {
  const authError = requireUploadToken(request);
  if (authError) {
    return authError;
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError(400, "Could not read request body");
  }

  const bodyResult = bodySchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return jsonError(400, bodyResult.error.issues[0]?.message ?? "Invalid body");
  }

  let parsed;
  try {
    parsed = parseTrf(bodyResult.data);
  } catch (err) {
    if (err instanceof TrfParseError) {
      return jsonError(400, err.message);
    }
    throw err;
  }

  try {
    const result = await uploadTournamentTrf(parsed);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof UploadConflictError) {
      return jsonError(409, err.message);
    }
    throw err;
  }
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
