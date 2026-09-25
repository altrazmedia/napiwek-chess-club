import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, players, standings, tournamentPlayers, tournaments } from "@/lib/db/schema";
import type { StatsRows } from "@/lib/stats/types";

export async function loadStatsRows(): Promise<StatsRows> {
  const [tournamentCountRows, playerRows, gameRows, rosterRows, standingRows] = await Promise.all([
    db.select({ value: count() }).from(tournaments),
    db
      .select({
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        slug: players.slug,
      })
      .from(players),
    db
      .select({
        heldOn: tournaments.heldOn,
        whitePlayerId: games.whitePlayerId,
        blackPlayerId: games.blackPlayerId,
        result: games.result,
      })
      .from(games)
      .innerJoin(tournaments, eq(games.tournamentId, tournaments.id)),
    db
      .select({
        heldOn: tournaments.heldOn,
        playerId: tournamentPlayers.playerId,
      })
      .from(tournamentPlayers)
      .innerJoin(tournaments, eq(tournamentPlayers.tournamentId, tournaments.id)),
    db
      .select({
        heldOn: tournaments.heldOn,
        playerId: standings.playerId,
        position: standings.position,
      })
      .from(standings)
      .innerJoin(tournaments, eq(standings.tournamentId, tournaments.id)),
  ]);

  return {
    tournamentCount: Number(tournamentCountRows[0]?.value ?? 0),
    players: playerRows,
    games: gameRows,
    roster: rosterRows,
    standings: standingRows,
  };
}
