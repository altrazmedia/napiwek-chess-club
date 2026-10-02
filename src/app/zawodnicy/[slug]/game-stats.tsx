import { listPlayerGames, type PlayerGameRow } from "@/lib/db/queries/players";
import { formatWinRate } from "@/lib/format-win-rate";
import { playerColorRecord, type ColorRecord } from "@/lib/stats/player";

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
      <h2 className="text-lg font-semibold">Statystyki partii</h2>
      <ColorBlock title="Ogólnie" record={records.overall} />
      <ColorBlock title="Białymi" record={records.white} />
      <ColorBlock title="Czarnymi" record={records.black} />
    </section>
  );
}

function ColorBlock({ title, record }: { title: string; record: ColorRecord }) {
  return (
    <div className="mt-4 flex flex-col gap-1">
      <h3 className="font-semibold">{title}</h3>
      <p>Rozegrane: {record.played}</p>
      <p>
        Zwycięstwa: {record.wins} ({formatWinRate(record.wins, record.played)})
      </p>
      <p>
        Remisy: {record.draws} ({formatWinRate(record.draws, record.played)})
      </p>
      <p>
        Porażki: {record.losses} ({formatWinRate(record.losses, record.played)})
      </p>
    </div>
  );
}

async function loadGames(playerId: string): Promise<PlayerGameRow[] | null> {
  try {
    return await listPlayerGames(playerId);
  } catch (error) {
    console.error(error);
    return null;
  }
}
