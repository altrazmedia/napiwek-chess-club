import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerListItem } from "@/lib/db/queries/players";
import { routes } from "@/lib/routes";

export function PlayerCard({ player }: { player: PlayerListItem }) {
  return (
    <Link href={routes.player(player.slug)} className="group block h-full">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold group-hover:underline">
            {player.firstName} {player.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p>Rozegrane turnieje: {player.tournamentsPlayed}</p>
          <p>Rozegrane partie: {player.gamesPlayed}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
