import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getTournamentBySlug, type TournamentPageData } from "@/lib/db/queries/tournaments";
import { tournamentPlayerRecords } from "@/lib/stats/tournament";
import { GamesTable } from "./games-table";
import { StandingsTable } from "./standings-table";
import { TournamentHeader } from "./tournament-header";

export default async function TournamentPage({ params }: PageProps<"/turnieje/[slug]">) {
  const { slug } = await params;
  const tournament = await loadTournament(slug);

  if (tournament === "error") {
    return (
      <PageShell title="Turniej">
        <p className="mt-6">Nie udało się wczytać turnieju.</p>
      </PageShell>
    );
  }

  if (tournament === null) {
    notFound();
  }

  const standings = standingsWithRecords(tournament);

  return (
    <PageShell>
      <TournamentHeader name={tournament.name} heldOn={tournament.heldOn} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start mt-6">
        <section className="lg:contents">
          <StandingsTable standings={standings} />
        </section>
        <section className="min-w-0 lg:flex-1">
          {tournament.games.length === 0 ? (
            <p>Brak partii.</p>
          ) : (
            <GamesTable key={slug} games={tournament.games} />
          )}
        </section>
      </div>
    </PageShell>
  );
}

function standingsWithRecords(tournament: TournamentPageData) {
  const records = tournamentPlayerRecords(
    tournament.games,
    tournament.standings.map((standing) => standing.player.id),
  );

  return tournament.standings.map((standing) => ({
    ...standing,
    record: records.get(standing.player.id) ?? {
      wins: 0,
      draws: 0,
      losses: 0,
      unplayedWins: 0,
    },
  }));
}

async function loadTournament(slug: string): Promise<TournamentPageData | null | "error"> {
  try {
    return await getTournamentBySlug(slug);
  } catch (error) {
    console.error(error);
    return "error";
  }
}
