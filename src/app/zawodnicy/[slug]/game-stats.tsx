import {
  GamesResultComparison,
  type GamesResultSegment,
} from "@/components/games-result-comparison";
import { SectionHeader } from "@/components/section-header";
import { listPlayerGames, type PlayerGameRow } from "@/lib/db/queries/players";
import { playerColorRecord, type ColorRecord } from "@/lib/stats/player";
import { ChessPawnIcon } from "lucide-react";

export async function GameStats({ playerId }: { playerId: string }) {
  const games = await loadGames(playerId);

  if (games === null) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Statystyki partii</h2>
        <p className="mt-3">Nie udało się wczytać statystyk partii.</p>
      </section>
    );
  }

  const records = playerColorRecord(games);

  return (
    <section className="mt-8">
      <SectionHeader title="Statystyki partii" icon={ChessPawnIcon} className="mb-4" />
      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <GamesResultComparison
          className="h-full"
          title="Ogólnie"
          segments={resultSegments(records.overall)}
        />
        <GamesResultComparison
          className="h-full"
          title="Białymi"
          segments={resultSegments(records.white)}
        />
        <GamesResultComparison
          className="h-full"
          title="Czarnymi"
          segments={resultSegments(records.black)}
        />
      </div>
    </section>
  );
}

function resultSegments(record: ColorRecord): GamesResultSegment[] {
  return [
    { label: "Zwycięstwa", value: record.wins, colorClassName: "bg-primary" },
    { label: "Remisy", value: record.draws, colorClassName: "bg-muted-foreground" },
    { label: "Porażki", value: record.losses, colorClassName: "bg-foreground" },
  ];
}

async function loadGames(playerId: string): Promise<PlayerGameRow[] | null> {
  try {
    return await listPlayerGames(playerId);
  } catch (error) {
    console.error(error);
    return null;
  }
}
