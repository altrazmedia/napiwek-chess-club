import { CalendarDays, UserRoundGroup } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { PlayersRanking } from "@/components/players-ranking";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { TournamentListItem } from "@/lib/db/queries/tournaments";
import { formatHeldOn } from "@/lib/format-held-on";
import { routes } from "@/lib/routes";

export function TournamentCard({ tournament }: { tournament: TournamentListItem }) {
  return (
    <Card className="h-full gap-0 py-0">
      <CardHeader className="r gap-3 bg-linear-to-r from-(--gradient-1) via-card via-50% to-card px-6 pt-6 pb-4">
        <CardTitle className="text-lg font-semibold tracking-[-0.16px]">
          <h2>
            <Link
              href={routes.tournament(tournament.slug)}
              className="transition-colors hover:text-primary"
            >
              {tournament.name}
            </Link>
          </h2>
        </CardTitle>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-3 stroke-primary" />
          {formatHeldOn(tournament.heldOn)}
        </p>
      </CardHeader>
      {tournament.podium.length > 0 ? (
        <CardContent className="p-6">
          <PlayersRanking
            rows={tournament.podium.map((entry) => ({
              id: entry.slug,
              position: entry.position,
              slug: entry.slug,
              name: entry.fullName,
              value: (
                <PodiumPoints
                  points={entry.points}
                  position={entry.position}
                  roundsPlayed={tournament.roundsPlayed}
                />
              ),
            }))}
          />
        </CardContent>
      ) : null}
      <CardFooter className="mt-auto border-t-0 bg-transparent px-6 pt-3 pb-6">
        <p className="flex items-center gap-1 font-medium text-muted-foreground">
          <UserRoundGroup aria-hidden="true" className="size-3.5" />
          {playerCountLabel(tournament.playerCount)}
        </p>
      </CardFooter>
    </Card>
  );
}

function PodiumPoints({
  points,
  position,
  roundsPlayed,
}: {
  points: string;
  position: number;
  roundsPlayed: number;
}) {
  return (
    <span className="inline-flex items-end gap-[4.5px]">
      <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.26px]">
        {formatCardPoints(points)}
      </span>
      <span
        className={cn(
          "text-[11px] leading-[16.5px] font-normal",
          position === 1 ? "text-(--gold--foreground-muted)/80" : "text-muted-foreground",
        )}
      >
        /{roundsPlayed} pkt
      </span>
    </span>
  );
}

function formatCardPoints(points: string) {
  return Number(points).toFixed(1);
}

function playerCountLabel(count: number) {
  if (count === 1) {
    return "1 zawodnik";
  }

  return `${count} zawodników`;
}
