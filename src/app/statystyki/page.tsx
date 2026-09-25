import { PageShell } from "@/components/page-shell";
import { loadStatsRows } from "@/lib/db/queries/stats";
import {
  globalGameCounts,
  topByTournamentWins,
  topByTournamentsPlayed,
  topByWinRate,
  topByWins,
} from "@/lib/stats/club";
import type { PlayerRank, StatsRows, WinRateRank } from "@/lib/stats/types";
import { PlayersStatisticsTable, type PlayersStatisticsRow } from "./players-statistics-table";

const percentFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatWinRate(wins: number, played: number) {
  return `${percentFormat.format((wins / played) * 100)}% (${wins}/${played})`;
}

function countRows(players: PlayerRank[]): PlayersStatisticsRow[] {
  return players.map((player) => ({
    id: player.id,
    slug: player.slug,
    name: player.fullName,
    value: String(player.value),
  }));
}

function winRateRows(players: WinRateRank[]): PlayersStatisticsRow[] {
  return players.map((player) => ({
    id: player.id,
    slug: player.slug,
    name: player.fullName,
    value: formatWinRate(player.wins, player.played),
  }));
}

export default async function StatsPage() {
  const rows = await loadRows();

  if (rows === null) {
    return (
      <PageShell title="Statystyki">
        <p className="mt-6">Nie udało się wczytać statystyk.</p>
      </PageShell>
    );
  }

  if (rows.tournamentCount === 0) {
    return (
      <PageShell title="Statystyki">
        <p className="mt-6">Nie ma jeszcze żadnych turniejów.</p>
      </PageShell>
    );
  }

  const globals = globalGameCounts(rows.games);
  const globalItems = [
    ["Liczba partii", globals.games],
    ["Wygrane białych", globals.whiteWins],
    ["Wygrane czarnych", globals.blackWins],
    ["Remisy", globals.draws],
  ] as const;

  return (
    <PageShell title="Statystyki">
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Ogółem</h2>
        <dl className="mt-3 flex flex-col gap-1">
          {globalItems.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt>{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <Ranking
        title="Najwięcej turniejów"
        valueHeader="Turnieje"
        rows={countRows(topByTournamentsPlayed(rows.players, rows.roster))}
      />
      <Ranking
        title="Najwięcej wygranych partii"
        valueHeader="Wygrane"
        rows={countRows(topByWins(rows.players, rows.games))}
      />
      <Ranking
        title="Najlepszy procent wygranych"
        valueHeader="Procent"
        rows={winRateRows(topByWinRate(rows.players, rows.games))}
      />
      <Ranking
        title="Najwięcej wygranych turniejów"
        valueHeader="Wygrane turnieje"
        rows={countRows(topByTournamentWins(rows.players, rows.standings))}
      />
    </PageShell>
  );
}

function Ranking({
  title,
  valueHeader,
  rows,
}: {
  title: string;
  valueHeader: string;
  rows: PlayersStatisticsRow[];
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <PlayersStatisticsTable valueHeader={valueHeader} rows={rows} />
    </section>
  );
}

async function loadRows(): Promise<StatsRows | null> {
  try {
    return await loadStatsRows();
  } catch (error) {
    console.error(error);
    return null;
  }
}
