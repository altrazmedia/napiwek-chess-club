import Link from "next/link";
import { Medal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TournamentListItem } from "@/lib/db/queries/tournaments";
import { formatHeldOn } from "@/lib/format-held-on";
import { routes } from "@/lib/routes";

const medalClassName: Record<number, string> = {
  1: "text-amber-500",
  2: "text-zinc-400",
  3: "text-amber-700",
};

export function TournamentCard({ tournament }: { tournament: TournamentListItem }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          <h2>
            <Link href={routes.tournament(tournament.slug)} className="hover:underline">
              {tournament.name}
            </Link>
          </h2>
        </CardTitle>
        <CardDescription>{formatHeldOn(tournament.heldOn)}</CardDescription>
      </CardHeader>
      {tournament.podium.length > 0 ? (
        <CardContent>
          <ol className="flex flex-col gap-1">
            {tournament.podium.map((entry) => (
              <li key={entry.slug} className="flex items-center gap-2">
                <span className="sr-only">{entry.position}. miejsce</span>
                <Medal
                  className={`size-4 shrink-0 ${medalClassName[entry.position]}`}
                  aria-hidden
                />
                <Link href={routes.player(entry.slug)} className="hover:underline">
                  {entry.fullName}
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      ) : null}
    </Card>
  );
}
