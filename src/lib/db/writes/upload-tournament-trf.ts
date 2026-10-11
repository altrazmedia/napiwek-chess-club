import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, players, standings, tournamentPlayers, tournaments } from "@/lib/db/schema";
import type { ParsedTrf, ParsedTrfGame, ParsedTrfPlayer } from "@/lib/trf/parse";
import { playerMatchKey } from "@/lib/trf/names";
import { reviewValidationError, type PlayerResolution } from "@/lib/trf/review";
import { playerSlugFromNames, tournamentSlugFromDate } from "@/lib/trf/slug";

export class UploadConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadConflictError";
  }
}

export class ReviewedUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewedUploadError";
  }
}

export type UploadTournamentTrfResult = {
  tournament: {
    id: string;
    slug: string;
    heldOn: string;
    name: string;
  };
  playersCreated: number;
  playersReused: number;
  gamesInserted: number;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function uploadTournamentTrf(parsed: ParsedTrf): Promise<UploadTournamentTrfResult> {
  return db.transaction(async (tx) => {
    const existingTournament = await tx.query.tournaments.findFirst({
      where: eq(tournaments.slug, parsed.slug),
      columns: { id: true },
    });
    if (existingTournament) {
      throw new UploadConflictError(`Tournament with slug "${parsed.slug}" already exists`);
    }

    const allPlayers = await tx.query.players.findMany({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
      },
    });

    const byMatchKey = new Map(allPlayers.map((p) => [playerMatchKey(p.firstName, p.lastName), p]));
    const bySlug = new Map(allPlayers.map((p) => [p.slug, p]));

    let playersCreated = 0;
    let playersReused = 0;
    const startNumberToPlayerId = new Map<number, string>();

    for (const p of parsed.players) {
      const key = playerMatchKey(p.firstName, p.lastName);
      const matched = byMatchKey.get(key);
      if (matched) {
        startNumberToPlayerId.set(p.startNumber, matched.id);
        playersReused += 1;
        continue;
      }

      const slugOwner = bySlug.get(p.slug);
      if (slugOwner) {
        throw new UploadConflictError(
          `Player slug "${p.slug}" is already taken by a different player`,
        );
      }

      const [inserted] = await tx
        .insert(players)
        .values({
          firstName: p.firstName,
          lastName: p.lastName,
          slug: p.slug,
        })
        .returning({
          id: players.id,
          firstName: players.firstName,
          lastName: players.lastName,
          slug: players.slug,
        });

      if (!inserted) {
        throw new Error(`Failed to insert player ${p.firstName} ${p.lastName}`);
      }

      byMatchKey.set(key, inserted);
      bySlug.set(inserted.slug, inserted);
      startNumberToPlayerId.set(p.startNumber, inserted.id);
      playersCreated += 1;
    }

    return persistTournament(tx, {
      name: parsed.name,
      heldOn: parsed.heldOn,
      slug: parsed.slug,
      players: parsed.players,
      games: parsed.games,
      startNumberToPlayerId,
      playersCreated,
      playersReused,
    });
  });
}

export async function uploadReviewedTournament(input: {
  parsed: ParsedTrf;
  name: string;
  heldOn: string;
  resolutions: PlayerResolution[];
}): Promise<UploadTournamentTrfResult> {
  return db.transaction(async (tx) => {
    const allPlayers = await tx.query.players.findMany({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
      },
    });

    const problem = reviewValidationError({
      name: input.name,
      heldOn: input.heldOn,
      startNumbers: input.parsed.players.map((player) => player.startNumber),
      resolutions: input.resolutions,
      dbPlayers: allPlayers,
    });
    if (problem) {
      throw new ReviewedUploadError(problem);
    }

    const slug = tournamentSlugFromDate(input.heldOn);
    const existingTournament = await tx.query.tournaments.findFirst({
      where: eq(tournaments.slug, slug),
      columns: { id: true },
    });
    if (existingTournament) {
      throw new ReviewedUploadError(`Turniej z datą ${input.heldOn} już istnieje.`);
    }

    let playersCreated = 0;
    let playersReused = 0;
    const startNumberToPlayerId = new Map<number, string>();

    for (const resolution of input.resolutions) {
      if (resolution.kind === "existing") {
        startNumberToPlayerId.set(resolution.startNumber, resolution.playerId);
        playersReused += 1;
        continue;
      }

      const firstName = resolution.firstName.trim();
      const lastName = resolution.lastName.trim();
      const [inserted] = await tx
        .insert(players)
        .values({
          firstName,
          lastName,
          slug: playerSlugFromNames(firstName, lastName),
        })
        .returning({ id: players.id });

      if (!inserted) {
        throw new Error(`Failed to insert player ${firstName} ${lastName}`);
      }

      startNumberToPlayerId.set(resolution.startNumber, inserted.id);
      playersCreated += 1;
    }

    return persistTournament(tx, {
      name: input.name.trim(),
      heldOn: input.heldOn,
      slug,
      players: input.parsed.players,
      games: input.parsed.games,
      startNumberToPlayerId,
      playersCreated,
      playersReused,
    });
  });
}

async function persistTournament(
  tx: Tx,
  input: {
    name: string;
    heldOn: string;
    slug: string;
    players: ParsedTrfPlayer[];
    games: ParsedTrfGame[];
    startNumberToPlayerId: Map<number, string>;
    playersCreated: number;
    playersReused: number;
  },
): Promise<UploadTournamentTrfResult> {
  const [tournament] = await tx
    .insert(tournaments)
    .values({
      name: input.name,
      heldOn: input.heldOn,
      slug: input.slug,
    })
    .returning({
      id: tournaments.id,
      slug: tournaments.slug,
      heldOn: tournaments.heldOn,
      name: tournaments.name,
    });

  if (!tournament) {
    throw new Error("Failed to insert tournament");
  }

  const rosterRows = input.players.map((player) => {
    const playerId = input.startNumberToPlayerId.get(player.startNumber);
    if (!playerId) {
      throw new Error(`Missing player id for start number ${player.startNumber}`);
    }
    return { tournamentId: tournament.id, playerId };
  });

  await tx.insert(tournamentPlayers).values(rosterRows);

  await tx.insert(standings).values(
    input.players.map((player) => {
      const playerId = input.startNumberToPlayerId.get(player.startNumber)!;
      return {
        tournamentId: tournament.id,
        playerId,
        position: player.position,
        points: player.points,
        buchholz: null,
        buchholzCut1: null,
        sonnebornBerger: null,
      };
    }),
  );

  if (input.games.length > 0) {
    await tx.insert(games).values(
      input.games.map((game) => {
        const whitePlayerId =
          game.whiteStartNumber === null
            ? null
            : (input.startNumberToPlayerId.get(game.whiteStartNumber) ?? null);
        const blackPlayerId =
          game.blackStartNumber === null
            ? null
            : (input.startNumberToPlayerId.get(game.blackStartNumber) ?? null);

        if (game.result === "bye") {
          if (whitePlayerId === null || blackPlayerId !== null) {
            throw new Error(`Invalid bye seating in round ${game.round}`);
          }
        } else if (whitePlayerId === null || blackPlayerId === null) {
          throw new Error(`Missing players for game in round ${game.round}`);
        }

        return {
          tournamentId: tournament.id,
          round: game.round,
          whitePlayerId,
          blackPlayerId,
          result: game.result,
        };
      }),
    );
  }

  return {
    tournament: {
      id: tournament.id,
      slug: tournament.slug,
      heldOn: tournament.heldOn,
      name: tournament.name,
    },
    playersCreated: input.playersCreated,
    playersReused: input.playersReused,
    gamesInserted: input.games.length,
  };
}
