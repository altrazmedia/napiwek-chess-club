import { and, count, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { games, players, standings, tournamentPlayers, tournaments } from "@/lib/db/schema";

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

export type PlayerIdentity = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
};

export type PlayerGameRow = {
  heldOn: string;
  result: (typeof games.$inferSelect)["result"];
  color: "white" | "black";
  opponent: PlayerIdentity | null;
};

export type PlayerTournamentRow = {
  slug: string;
  name: string;
  heldOn: string;
  position: number;
  points: string;
};

export async function getPlayerBySlug(slug: string): Promise<PlayerIdentity | null> {
  const [player] = await db
    .select({
      id: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      slug: players.slug,
    })
    .from(players)
    .where(eq(players.slug, slug))
    .limit(1);

  return player ?? null;
}

export async function listPlayerGames(playerId: string): Promise<PlayerGameRow[]> {
  const [whiteGames, blackGames] = await Promise.all([
    listGamesForColor(playerId, "white"),
    listGamesForColor(playerId, "black"),
  ]);
  return [...whiteGames, ...blackGames];
}

export async function listPlayerTournaments(playerId: string): Promise<PlayerTournamentRow[]> {
  return db
    .select({
      slug: tournaments.slug,
      name: tournaments.name,
      heldOn: tournaments.heldOn,
      position: standings.position,
      points: standings.points,
    })
    .from(tournamentPlayers)
    .innerJoin(tournaments, eq(tournaments.id, tournamentPlayers.tournamentId))
    .innerJoin(
      standings,
      and(
        eq(standings.tournamentId, tournamentPlayers.tournamentId),
        eq(standings.playerId, tournamentPlayers.playerId),
      ),
    )
    .where(eq(tournamentPlayers.playerId, playerId));
}

async function listGamesForColor(
  playerId: string,
  color: "white" | "black",
): Promise<PlayerGameRow[]> {
  const opponent = alias(players, color === "white" ? "black_seat" : "white_seat");
  const playerColumn = color === "white" ? games.whitePlayerId : games.blackPlayerId;
  const opponentColumn = color === "white" ? games.blackPlayerId : games.whitePlayerId;

  const rows = await db
    .select({
      heldOn: tournaments.heldOn,
      result: games.result,
      opponentId: opponent.id,
      opponentFirstName: opponent.firstName,
      opponentLastName: opponent.lastName,
      opponentSlug: opponent.slug,
    })
    .from(games)
    .innerJoin(tournaments, eq(tournaments.id, games.tournamentId))
    .leftJoin(opponent, eq(opponent.id, opponentColumn))
    .where(eq(playerColumn, playerId));

  return rows.map((row) => ({
    heldOn: row.heldOn,
    result: row.result,
    color,
    opponent:
      row.opponentId && row.opponentFirstName && row.opponentLastName && row.opponentSlug
        ? {
            id: row.opponentId,
            firstName: row.opponentFirstName,
            lastName: row.opponentLastName,
            slug: row.opponentSlug,
          }
        : null,
  }));
}
