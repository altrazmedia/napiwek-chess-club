import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { games, players, tournaments } from "@/lib/db/schema";
import type { HeadToHeadGame } from "@/lib/stats/head-to-head";
import type { DateRange } from "@/lib/stats/types";

const playedResults = ["white_win", "black_win", "draw"] as const;

export type PlayerOption = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
};

export async function listPlayerOptions(): Promise<PlayerOption[]> {
  const rows = await db
    .select({
      id: players.id,
      slug: players.slug,
      firstName: players.firstName,
      lastName: players.lastName,
    })
    .from(players);

  return rows.sort(comparePlayers);
}

function comparePlayers(a: PlayerOption, b: PlayerOption) {
  return (
    a.lastName.localeCompare(b.lastName, "pl") ||
    a.firstName.localeCompare(b.firstName, "pl") ||
    a.slug.localeCompare(b.slug, "pl")
  );
}

const whitePlayer = alias(players, "head_to_head_white");
const blackPlayer = alias(players, "head_to_head_black");

export async function listHeadToHeadGames(
  playerAId: string,
  playerBId: string,
  range?: DateRange,
): Promise<HeadToHeadGame[]> {
  const rows = await db
    .select({
      id: games.id,
      tournamentSlug: tournaments.slug,
      tournamentName: tournaments.name,
      heldOn: tournaments.heldOn,
      round: games.round,
      result: games.result,
      whiteId: whitePlayer.id,
      whiteSlug: whitePlayer.slug,
      whiteFirstName: whitePlayer.firstName,
      whiteLastName: whitePlayer.lastName,
      blackId: blackPlayer.id,
      blackSlug: blackPlayer.slug,
      blackFirstName: blackPlayer.firstName,
      blackLastName: blackPlayer.lastName,
    })
    .from(games)
    .innerJoin(tournaments, eq(tournaments.id, games.tournamentId))
    .innerJoin(whitePlayer, eq(whitePlayer.id, games.whitePlayerId))
    .innerJoin(blackPlayer, eq(blackPlayer.id, games.blackPlayerId))
    .where(
      and(
        inArray(games.result, [...playedResults]),
        or(
          and(eq(games.whitePlayerId, playerAId), eq(games.blackPlayerId, playerBId)),
          and(eq(games.whitePlayerId, playerBId), eq(games.blackPlayerId, playerAId)),
        ),
        range?.from ? gte(tournaments.heldOn, range.from) : undefined,
        range?.to ? lte(tournaments.heldOn, range.to) : undefined,
      ),
    );

  return rows.flatMap((row) => {
    if (row.result !== "white_win" && row.result !== "black_win" && row.result !== "draw") {
      return [];
    }

    return [
      {
        id: row.id,
        tournamentSlug: row.tournamentSlug,
        tournamentName: row.tournamentName,
        heldOn: row.heldOn,
        round: row.round,
        result: row.result,
        white: {
          id: row.whiteId,
          slug: row.whiteSlug,
          firstName: row.whiteFirstName,
          lastName: row.whiteLastName,
        },
        black: {
          id: row.blackId,
          slug: row.blackSlug,
          firstName: row.blackFirstName,
          lastName: row.blackLastName,
        },
      },
    ];
  });
}
