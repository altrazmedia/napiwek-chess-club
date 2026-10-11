"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkUploadToken } from "@/lib/auth/require-upload-token";
import {
  ReviewedUploadError,
  uploadReviewedTournament,
} from "@/lib/db/writes/upload-tournament-trf";
import { parseTrf, TrfParseError } from "@/lib/trf/parse";

const resolutionSchema = z.discriminatedUnion("kind", [
  z.object({
    startNumber: z.number().int().positive(),
    kind: z.literal("existing"),
    playerId: z.string().min(1),
  }),
  z.object({
    startNumber: z.number().int().positive(),
    kind: z.literal("new"),
    firstName: z.string(),
    lastName: z.string(),
  }),
]);

const inputSchema = z.object({
  token: z.string(),
  trf: z.string(),
  name: z.string(),
  heldOn: z.string(),
  players: z.array(resolutionSchema),
});

export type SaveUploadedTournamentResult =
  { ok: true; slug: string; name: string } | { ok: false; error: string };

const genericError = "Nie udało się zapisać turnieju.";

export async function saveUploadedTournament(
  input: unknown,
): Promise<SaveUploadedTournamentResult> {
  const failure = checkUploadToken(readToken(input));
  if (failure === "unconfigured") {
    return { ok: false, error: "Wgrywanie nie jest skonfigurowane." };
  }
  if (failure === "unauthorized") {
    return { ok: false, error: "Nieprawidłowy token." };
  }

  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { ok: false, error: genericError };
  }

  let parsed;
  try {
    parsed = parseTrf(parsedInput.data.trf);
  } catch (error) {
    console.error(error);
    if (error instanceof TrfParseError) {
      return { ok: false, error: "Nie udało się odczytać pliku TRF." };
    }
    return { ok: false, error: genericError };
  }

  try {
    const result = await uploadReviewedTournament({
      parsed,
      name: parsedInput.data.name,
      heldOn: parsedInput.data.heldOn,
      resolutions: parsedInput.data.players,
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      slug: result.tournament.slug,
      name: result.tournament.name,
    };
  } catch (error) {
    if (error instanceof ReviewedUploadError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: genericError };
  }
}

function readToken(input: unknown): string {
  if (typeof input !== "object" || input === null || !("token" in input)) {
    return "";
  }
  return typeof input.token === "string" ? input.token : "";
}
