import Link from "next/link";
import { listPlayerTournaments, type PlayerTournamentRow } from "@/lib/db/queries/players";
import { formatHeldOn } from "@/lib/format-held-on";
import { formatPoints } from "@/lib/format-points";
import { routes } from "@/lib/routes";
import { playerTournamentSummary } from "@/lib/stats/player";

export async function TournamentResults({ playerId }: { playerId: string }) {
  const tournaments = await loadTournaments(playerId);

  if (tournaments === null) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Rozegrane turnieje</h2>
        <p className="mt-3">Nie udało się wczytać turniejów.</p>
      </section>
    );
  }

  const summary = playerTournamentSummary(tournaments);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Rozegrane turnieje</h2>
      <p className="mt-3">Zwycięstwa w turniejach: {summary.wins}</p>
      <p>Podium w turniejach: {summary.podiums}</p>
      {summary.tournaments.length === 0 ? (
        <p className="mt-3">Ten zawodnik nie grał jeszcze w żadnym turnieju.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {summary.tournaments.map((tournament) => (
            <li key={tournament.slug}>
              <Link href={routes.tournament(tournament.slug)} className="hover:underline">
                {tournament.name}
              </Link>
              {" — "}
              {formatHeldOn(tournament.heldOn)}
              {" — "}
              {tournament.position}. miejsce, {formatPoints(tournament.points)} pkt
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function loadTournaments(playerId: string): Promise<PlayerTournamentRow[] | null> {
  try {
    return await listPlayerTournaments(playerId);
  } catch (error) {
    console.error(error);
    return null;
  }
}
