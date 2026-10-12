import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerListItem } from "@/lib/db/queries/players";
import { routes } from "@/lib/routes";
import { ChessPawnIcon, TrophyIcon } from "lucide-react";
import { polishPlural } from "@/lib/polish-plural";

export function PlayerCard({ player }: { player: PlayerListItem }) {
  return (
    <Link href={routes.player(player.slug)} className="group block h-full">
      <Card className="h-full" gradient>
        <CardHeader>
          <CardTitle className="text-xl font-semibold group-hover:text-primary">
            {player.firstName} {player.lastName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TrophyIcon className="stroke-primary size-4" /><p>{player.tournamentsPlayed} {polishPlural(player.tournamentsPlayed, {
              one: "ukończony turniej",
              few: "ukończone turnieje",
              many: "ukończonych turniejów",
            })}</p>
          </div>
          <div className="flex items-center gap-2">
            <ChessPawnIcon className="stroke-primary size-4" /><p>{player.gamesPlayed} {polishPlural(player.gamesPlayed, {
              one: "rozegrana partia",
              few: "rozegrane partie",
              many: "rozegranych partii",
            })}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
