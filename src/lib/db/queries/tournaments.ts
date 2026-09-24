import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { players, standings, tournaments } from "@/lib/db/schema";

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
