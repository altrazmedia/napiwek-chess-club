import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getTournamentBySlug, type TournamentPageData } from "@/lib/db/queries/tournaments";
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

  return (
    <PageShell>
      <TournamentHeader name={tournament.name} heldOn={tournament.heldOn} />
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Klasyfikacja</h2>
        {tournament.standings.length === 0 ? (
          <p className="mt-3">Brak klasyfikacji.</p>
        ) : (
          <StandingsTable standings={tournament.standings} />
        )}
      </section>
      {tournament.games.length === 0 ? (
        <p className="mt-8">Brak partii.</p>
      ) : (
        <GamesTable games={tournament.games} />
      )}
    </PageShell>
  );
}

async function loadTournament(slug: string): Promise<TournamentPageData | null | "error"> {
  try {
    return await getTournamentBySlug(slug);
  } catch (error) {
    console.error(error);
    return "error";
  }
}
