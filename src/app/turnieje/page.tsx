import { PageShell } from "@/components/page-shell";
import { listTournaments, type TournamentListItem } from "@/lib/db/queries/tournaments";
import { TournamentCard } from "./tournament-card";

export default async function TournamentsPage() {
  const tournaments = await loadTournaments();

  if (tournaments === null) {
    return (
      <PageShell title="Turnieje">
        <p className="mt-6">Nie udało się wczytać turniejów.</p>
      </PageShell>
    );
  }

  if (tournaments.length === 0) {
    return (
      <PageShell title="Turnieje">
        <p className="mt-6">Nie ma jeszcze żadnych turniejów.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Turnieje">
      <ul className="mt-6 flex flex-col gap-4">
        {tournaments.map((tournament) => (
          <li key={tournament.slug}>
            <TournamentCard tournament={tournament} />
          </li>
        ))}
      </ul>
    </PageShell>
  );
}

async function loadTournaments(): Promise<TournamentListItem[] | null> {
  try {
    return await listTournaments();
  } catch (error) {
    console.error(error);
    return null;
  }
}
