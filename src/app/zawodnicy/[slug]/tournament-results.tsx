import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";
import { cn } from "cn";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { listPlayerTournaments, type PlayerTournamentRow } from "@/lib/db/queries/players";
import { formatHeldOn } from "@/lib/format-held-on";
import { formatPoints } from "@/lib/format-points";
import { routes } from "@/lib/routes";
import { playerTournamentSummary } from "@/lib/stats/player";

const badgeClassName = {
  1: "bg-(--gold) text-(--gold-foreground)",
  2: "bg-(--silver) text-(--silver-foreground)",
  3: "bg-(--bronze) text-(--bronze-foreground)",
} as const;

export async function TournamentResults({ playerId }: { playerId: string }) {
  const tournaments = await loadTournaments(playerId);

  if (tournaments === null) {
    return (
      <section>
        <SectionHeader title="Rozegrane turnieje" icon={Trophy} className="mb-4" />
        <p>Nie udało się wczytać turniejów.</p>
      </section>
    );
  }

  const summary = playerTournamentSummary(tournaments);

  return (
    <section>
      <SectionHeader title="Rozegrane turnieje" icon={Trophy} className="mb-4" />
      {summary.tournaments.length === 0 ? (
        <p>Ten zawodnik nie grał jeszcze w żadnym turnieju.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.tournaments.map((tournament) => (
            <li key={tournament.slug}>
              <Link href={routes.tournament(tournament.slug)} className="group block">
                <Card size="sm">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium group-hover:underline">{tournament.name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                        <CalendarDays aria-hidden className="size-3.5 shrink-0 text-primary" />
                        {formatHeldOn(tournament.heldOn)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                        placeBadgeClassName(tournament.position),
                      )}
                    >
                      {placeLabel(tournament.position, tournament.points)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function placeBadgeClassName(position: number) {
  if (position === 1 || position === 2 || position === 3) {
    return badgeClassName[position];
  }

  return "bg-muted text-muted-foreground";
}

function placeLabel(position: number, points: string) {
  return `${position}. miejsce · ${formatPoints(points)} pkt`;
}

async function loadTournaments(playerId: string): Promise<PlayerTournamentRow[] | null> {
  try {
    return await listPlayerTournaments(playerId);
  } catch (error) {
    console.error(error);
    return null;
  }
}
