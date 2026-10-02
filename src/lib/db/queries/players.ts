import { count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, players, tournamentPlayers } from "@/lib/db/schema";

const playedResults = ["white_win", "black_win", "draw"] as const;

export type PlayerListItem = {
  slug: string;
  firstName: string;
  lastName: string;
  tournamentsPlayed: number;
  gamesPlayed: number;
};

export async function listPlayers(): Promise<PlayerListItem[]> {
  const tournamentCounts = db
    .select({
      playerId: tournamentPlayers.playerId,
      tournamentsPlayed: count().as("tournaments_played"),
    })
    .from(tournamentPlayers)
    .groupBy(tournamentPlayers.playerId)
    .as("tournament_counts");

  const whiteCounts = db
    .select({
      playerId: games.whitePlayerId,
      gamesPlayed: count().as("white_games"),
    })
    .from(games)
    .where(inArray(games.result, [...playedResults]))
    .groupBy(games.whitePlayerId)
    .as("white_counts");

  const blackCounts = db
    .select({
      playerId: games.blackPlayerId,
      gamesPlayed: count().as("black_games"),
    })
    .from(games)
    .where(inArray(games.result, [...playedResults]))
    .groupBy(games.blackPlayerId)
    .as("black_counts");

  const rows = await db
    .select({
      slug: players.slug,
      firstName: players.firstName,
      lastName: players.lastName,
      tournamentsPlayed: sql<number>`coalesce(${tournamentCounts.tournamentsPlayed}, 0)::int`,
      whiteGames: sql<number>`coalesce(${whiteCounts.gamesPlayed}, 0)::int`,
      blackGames: sql<number>`coalesce(${blackCounts.gamesPlayed}, 0)::int`,
    })
    .from(players)
    .leftJoin(tournamentCounts, eq(players.id, tournamentCounts.playerId))
    .leftJoin(whiteCounts, eq(players.id, whiteCounts.playerId))
    .leftJoin(blackCounts, eq(players.id, blackCounts.playerId));

  return rows
    .map((row) => ({
      slug: row.slug,
      firstName: row.firstName,
      lastName: row.lastName,
      tournamentsPlayed: Number(row.tournamentsPlayed),
      gamesPlayed: Number(row.whiteGames) + Number(row.blackGames),
    }))
    .sort(comparePlayers);
}

function comparePlayers(a: PlayerListItem, b: PlayerListItem) {
  return (
    a.lastName.localeCompare(b.lastName, "pl") ||
    a.firstName.localeCompare(b.firstName, "pl") ||
    a.slug.localeCompare(b.slug, "pl")
  );
}
