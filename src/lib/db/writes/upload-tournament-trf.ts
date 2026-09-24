import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, players, standings, tournamentPlayers, tournaments } from "@/lib/db/schema";
import type { ParsedTrf } from "@/lib/trf/parse";
import { playerMatchKey } from "@/lib/trf/names";

export class UploadConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadConflictError";
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

    const [tournament] = await tx
      .insert(tournaments)
      .values({
        name: parsed.name,
        heldOn: parsed.heldOn,
        slug: parsed.slug,
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

    const rosterRows = parsed.players.map((p) => {
      const playerId = startNumberToPlayerId.get(p.startNumber);
      if (!playerId) {
        throw new Error(`Missing player id for start number ${p.startNumber}`);
      }
      return { tournamentId: tournament.id, playerId };
    });

    await tx.insert(tournamentPlayers).values(rosterRows);

    await tx.insert(standings).values(
      parsed.players.map((p) => {
        const playerId = startNumberToPlayerId.get(p.startNumber)!;
        return {
          tournamentId: tournament.id,
          playerId,
          position: p.position,
          points: p.points,
          buchholz: null,
          buchholzCut1: null,
          sonnebornBerger: null,
        };
      }),
    );

    if (parsed.games.length > 0) {
      await tx.insert(games).values(
        parsed.games.map((g) => {
          const whitePlayerId =
            g.whiteStartNumber === null
              ? null
              : (startNumberToPlayerId.get(g.whiteStartNumber) ?? null);
          const blackPlayerId =
            g.blackStartNumber === null
              ? null
              : (startNumberToPlayerId.get(g.blackStartNumber) ?? null);

          if (g.result === "bye") {
            if (whitePlayerId === null || blackPlayerId !== null) {
              throw new Error(`Invalid bye seating in round ${g.round}`);
            }
          } else if (whitePlayerId === null || blackPlayerId === null) {
            throw new Error(`Missing players for game in round ${g.round}`);
          }

          return {
            tournamentId: tournament.id,
            round: g.round,
            whitePlayerId,
            blackPlayerId,
            result: g.result,
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
      playersCreated,
      playersReused,
      gamesInserted: parsed.games.length,
    };
  });
}
