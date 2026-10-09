import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { StatisticCard } from "@/components/statistic-card";
import { loadStatsRows } from "@/lib/db/queries/stats";
import { formatWinRatePercent } from "@/lib/format-win-rate";
import { routes } from "@/lib/routes";
import {
  globalGameCounts,
  topByTournamentWins,
  topByTournamentsPlayed,
  topByWinRate,
  topByWins,
} from "@/lib/stats/club";
import type { PlayerRank, StatsRows, WinRateRank } from "@/lib/stats/types";

type PlayersStatisticsRow = {
  id: string;
  slug: string;
  name: string;
  value: string;
  ranking: number;
};

function countRows(players: PlayerRank[]): PlayersStatisticsRow[] {
  return assignCompetitionRanks(players, (row, previous) => row.value === previous.value).map(
    (player) => ({
      id: player.id,
      slug: player.slug,
      name: player.fullName,
      value: String(player.value),
      ranking: player.ranking,
    }),
  );
}

function winRateRows(players: WinRateRank[]): PlayersStatisticsRow[] {
  return assignCompetitionRanks(
    players,
    (row, previous) => row.wins * previous.played === previous.wins * row.played,
  ).map((player) => ({
    id: player.id,
    slug: player.slug,
    name: player.fullName,
    value: formatWinRatePercent(player.wins, player.played),
    ranking: player.ranking,
  }));
}

function assignCompetitionRanks<T>(
  rows: T[],
  tiedWithPrevious: (row: T, previous: T) => boolean,
): Array<T & { ranking: number }> {
  let ranking = 0;
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    if (index === 0 || !previous || !tiedWithPrevious(row, previous)) {
      ranking = index + 1;
    }
    return { ...row, ranking };
  });
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
        rows={countRows(topByTournamentsPlayed(rows.players, rows.roster))}
      />
      <Ranking
        title="Najwięcej wygranych partii"
        rows={countRows(topByWins(rows.players, rows.games))}
      />
      <Ranking
        title="Najlepszy procent wygranych"
        rows={winRateRows(topByWinRate(rows.players, rows.games))}
      />
      <Ranking
        title="Najwięcej wygranych turniejów"
        rows={countRows(topByTournamentWins(rows.players, rows.standings))}
      />
    </PageShell>
  );
}

function Ranking({ title, rows }: { title: string; rows: PlayersStatisticsRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3">Brak zawodników.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id} className="h-full">
              <Link href={routes.player(row.slug)} className="block h-full">
                <StatisticCard title={row.name} description={row.value} ranking={row.ranking} />
              </Link>
            </li>
          ))}
        </ul>
      )}
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
