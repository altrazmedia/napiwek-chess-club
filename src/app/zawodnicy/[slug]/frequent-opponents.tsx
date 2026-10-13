import Link from "next/link";
import { Swords } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Card, CardFooter } from "@/components/ui/card";
import { listPlayerGames, listPlayerTournaments } from "@/lib/db/queries/players";
import { polishPlural } from "@/lib/polish-plural";
import { routes } from "@/lib/routes";
import { frequentOpponents, type FrequentOpponent } from "@/lib/stats/player";

export async function FrequentOpponents({
  playerId,
  playerSlug,
}: {
  playerId: string;
  playerSlug: string;
}) {
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
              <li
                key={opponent.id}
                className="flex items-center justify-between gap-4 px-(--card-spacing) py-2.5"
              >
                <Link
                  href={routes.player(opponent.slug)}
                  className="min-w-0 font-medium hover:underline"
                >
                  {opponent.firstName} {opponent.lastName}
                </Link>
                <Link
                  href={routes.headToHead(playerSlug, opponent.slug)}
                  className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:underline"
                >
                  {partieLabel(opponent.games)}
                </Link>
              </li>
            ))}
          </ul>
          <CardFooter className="mt-1 border-t bg-transparent p-2">
            <Link
              href={routes.headToHead(playerSlug)}
              className="flex h-8 w-full items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-muted"
            >
              Pokaż pojedynki z innymi graczami
            </Link>
          </CardFooter>
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
