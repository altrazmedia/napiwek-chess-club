import { and, asc, desc, eq, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { games, players, standings, tournaments } from "@/lib/db/schema";

export type TournamentPodiumEntry = {
  position: number;
  fullName: string;
  slug: string;
};

export type TournamentListItem = {
  slug: string;
  name: string;
  heldOn: string;
  podium: TournamentPodiumEntry[];
};

export async function listTournaments(): Promise<TournamentListItem[]> {
  const rows = await db
    .select({
      slug: tournaments.slug,
      name: tournaments.name,
      heldOn: tournaments.heldOn,
      position: standings.position,
      fullName: players.fullName,
      playerSlug: players.slug,
    })
    .from(tournaments)
    .leftJoin(
      standings,
      and(eq(standings.tournamentId, tournaments.id), lte(standings.position, 3)),
    )
    .leftJoin(players, eq(players.id, standings.playerId))
    .orderBy(desc(tournaments.heldOn), asc(standings.position));

  const bySlug = new Map<string, TournamentListItem>();

  for (const row of rows) {
    let tournament = bySlug.get(row.slug);
    if (!tournament) {
      tournament = {
        slug: row.slug,
        name: row.name,
        heldOn: row.heldOn,
        podium: [],
      };
      bySlug.set(row.slug, tournament);
    }

    if (row.position != null && row.fullName != null && row.playerSlug != null) {
      tournament.podium.push({
        position: row.position,
        fullName: row.fullName,
        slug: row.playerSlug,
      });
    }
  }

  return [...bySlug.values()];
}

export type TournamentPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
};

export type TournamentStanding = {
  position: number;
  points: string;
  player: TournamentPlayer;
};

export type TournamentGameResult = (typeof games.$inferSelect)["result"];

export type TournamentGame = {
  id: string;
  round: number;
  result: TournamentGameResult;
  white: TournamentPlayer | null;
  black: TournamentPlayer | null;
};

export type TournamentPageData = {
  name: string;
  heldOn: string;
  standings: TournamentStanding[];
  games: TournamentGame[];
};

const whitePlayer = alias(players, "white_player");
const blackPlayer = alias(players, "black_player");

export async function getTournamentBySlug(slug: string): Promise<TournamentPageData | null> {
  const [tournament] = await db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      heldOn: tournaments.heldOn,
    })
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);

  if (!tournament) {
    return null;
  }

  const [standingRows, gameRows] = await Promise.all([
    db
      .select({
        position: standings.position,
        points: standings.points,
        playerId: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        playerSlug: players.slug,
      })
      .from(standings)
      .innerJoin(players, eq(standings.playerId, players.id))
      .where(eq(standings.tournamentId, tournament.id))
      .orderBy(asc(standings.position)),
    db
      .select({
        id: games.id,
        round: games.round,
        result: games.result,
        whiteId: whitePlayer.id,
        whiteFirstName: whitePlayer.firstName,
        whiteLastName: whitePlayer.lastName,
        whiteSlug: whitePlayer.slug,
        blackId: blackPlayer.id,
        blackFirstName: blackPlayer.firstName,
        blackLastName: blackPlayer.lastName,
        blackSlug: blackPlayer.slug,
      })
      .from(games)
      .leftJoin(whitePlayer, eq(games.whitePlayerId, whitePlayer.id))
      .leftJoin(blackPlayer, eq(games.blackPlayerId, blackPlayer.id))
      .where(eq(games.tournamentId, tournament.id))
      .orderBy(asc(games.round)),
  ]);

  return {
    name: tournament.name,
    heldOn: tournament.heldOn,
    standings: standingRows.map((row) => ({
      position: row.position,
      points: row.points,
      player: {
        id: row.playerId,
        firstName: row.firstName,
        lastName: row.lastName,
        slug: row.playerSlug,
      },
    })),
    games: gameRows.map((row) => ({
      id: row.id,
      round: row.round,
      result: row.result,
      white: toPlayer(row.whiteId, row.whiteFirstName, row.whiteLastName, row.whiteSlug),
      black: toPlayer(row.blackId, row.blackFirstName, row.blackLastName, row.blackSlug),
    })),
  };
}

function toPlayer(
  id: string | null,
  firstName: string | null,
  lastName: string | null,
  slug: string | null,
): TournamentPlayer | null {
  if (id == null || firstName == null || lastName == null || slug == null) {
    return null;
  }
  return { id, firstName, lastName, slug };
}
