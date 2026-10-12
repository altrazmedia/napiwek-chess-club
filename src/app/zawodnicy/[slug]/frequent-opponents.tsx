import Link from "next/link";
import { Swords } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Card } from "@/components/ui/card";
import { listPlayerGames, listPlayerTournaments } from "@/lib/db/queries/players";
import { polishPlural } from "@/lib/polish-plural";
import { routes } from "@/lib/routes";
import { frequentOpponents, type FrequentOpponent } from "@/lib/stats/player";

export async function FrequentOpponents({ playerId }: { playerId: string }) {
  const opponents = await loadOpponents(playerId);

  if (opponents === "error") {
    return (
      <section>
        <SectionHeader title="Najczęstsi przeciwnicy" icon={Swords} className="mb-4" />
        <p>Nie udało się wczytać przeciwników.</p>
      </section>
    );
  }

  if (opponents === null) {
    return null;
  }

  return (
    <section>
      <SectionHeader title="Najczęstsi przeciwnicy" icon={Swords} className="mb-4" />
      {opponents.length === 0 ? (
        <p>Ten zawodnik nie rozegrał jeszcze partii z innymi zawodnikami.</p>
      ) : (
        <Card size="sm" className="gap-0 py-2">
          <ul>
            {opponents.map((opponent) => (
              <li key={opponent.id}>
                <Link
                  href={routes.player(opponent.slug)}
                  className="group flex items-center justify-between gap-4 px-(--card-spacing) py-2.5"
                >
                  <span className="min-w-0 font-medium group-hover:underline">
                    {opponent.firstName} {opponent.lastName}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {partieLabel(opponent.games)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
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
  const form = polishPlural(count, { one: "partia", few: "partie", many: "partii" });
  return `${count} ${form}`;
}
