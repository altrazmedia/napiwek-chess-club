import Link from "next/link";
import { listPlayerGames, listPlayerTournaments } from "@/lib/db/queries/players";
import { routes } from "@/lib/routes";
import { frequentOpponents, type FrequentOpponent } from "@/lib/stats/player";

export async function FrequentOpponents({ playerId }: { playerId: string }) {
  const opponents = await loadOpponents(playerId);

  if (opponents === "error") {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Najczęstsi przeciwnicy</h2>
        <p className="mt-3">Nie udało się wczytać przeciwników.</p>
      </section>
    );
  }

  if (opponents === null) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Najczęstsi przeciwnicy</h2>
      {opponents.length === 0 ? (
        <p className="mt-3">Ten zawodnik nie rozegrał jeszcze partii z innymi zawodnikami.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {opponents.map((opponent) => (
            <li key={opponent.id}>
              <Link href={routes.player(opponent.slug)} className="hover:underline">
                {opponent.firstName} {opponent.lastName}
              </Link>
              {" — "}
              {partieLabel(opponent.games)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function loadOpponents(playerId: string): Promise<FrequentOpponent[] | null | "error"> {
  try {
    const [games, tournaments] = await Promise.all([
      listPlayerGames(playerId),
      listPlayerTournaments(playerId),
    ]);
    return frequentOpponents(games, tournaments);
  } catch (error) {
    console.error(error);
    return "error";
  }
}

function partieLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (count === 1) {
    return "1 partia";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} partie`;
  }
  return `${count} partii`;
}
