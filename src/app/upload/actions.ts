"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkUploadToken } from "@/lib/auth/require-upload-token";
import { suggestPlayersByName, type PlayerNameSuggestion } from "@/lib/db/queries/players";
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
  chessManagerUrl: z.string(),
  players: z.array(resolutionSchema),
});

export type SaveUploadedTournamentResult =
  { ok: true; slug: string; name: string } | { ok: false; error: string };

const genericError = "Nie udało się zapisać turnieju.";
const suggestError = "Nie udało się dopasować zawodników.";

const suggestSchema = z.array(
  z.object({
    firstName: z.string(),
    lastName: z.string(),
  }),
);

export type SuggestedPlayer = PlayerNameSuggestion;

export type SuggestUploadPlayersResult =
  { ok: true; matches: (SuggestedPlayer | null)[] } | { ok: false; error: string };

export async function suggestUploadPlayers(input: unknown): Promise<SuggestUploadPlayersResult> {
  const parsed = suggestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: suggestError };
  }

  try {
    const matches = await suggestPlayersByName(parsed.data);
    return { ok: true, matches };
  } catch (error) {
    console.error(error);
    return { ok: false, error: suggestError };
  }
}

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
      chessManagerUrl: parsedInput.data.chessManagerUrl,
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
