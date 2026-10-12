import { Trophy } from "lucide-react";
import { GamesResultComparison } from "@/components/games-result-comparison";
import { PageShell } from "@/components/page-shell";
import { PlayersRanking } from "@/components/players-ranking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadStatsRows } from "@/lib/db/queries/stats";
import { formatWinRatePercent } from "@/lib/format-win-rate";
import { polishPlural, type PolishPluralForms } from "@/lib/polish-plural";
import {
  globalGameCounts,
  topByTournamentWins,
  topByTournamentsPlayed,
  topByWinRate,
  topByWins,
} from "@/lib/stats/club";
import type { PlayerRank, StatsRows, WinRateRank } from "@/lib/stats/types";
import { StatsTotals } from "./stats-totals";

type PlayersStatisticsRow = {
  id: string;
  slug: string;
  name: string;
  value: string;
  score: number;
  ranking: number;
};

const tournamentForms = {
  one: "turniej",
  few: "turnieje",
  many: "turniejów",
} satisfies PolishPluralForms;

const winForms = {
  one: "zwycięstwo",
  few: "zwycięstwa",
  many: "zwycięstw",
} satisfies PolishPluralForms;

const gameForms = {
  one: "partia",
  few: "partie",
  many: "partii",
} satisfies PolishPluralForms;

function countRows(players: PlayerRank[], forms: PolishPluralForms): PlayersStatisticsRow[] {
  return assignCompetitionRanks(players, (row, previous) => row.value === previous.value).map(
    (player) => ({
      id: player.id,
      slug: player.slug,
      name: player.fullName,
      value: `${player.value} ${polishPlural(player.value, forms)}`,
      score: player.value,
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
    score: player.played === 0 ? 0 : player.wins / player.played,
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

  return (
    <PageShell title="Statystyki">
      <section className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <StatsTotals tournaments={rows.tournamentCount} games={globals.games} />
        <GamesResultComparison
          className="h-full"
          title="Rozkład wyników partii"
          segments={[
            {
              label: "Białe",
              value: globals.whiteWins,
              colorClassName: "bg-card border border-border",
            },
            {
              label: "Remisy",
              value: globals.draws,
              colorClassName: "bg-muted-foreground",
            },
            {
              label: "Czarne",
              value: globals.blackWins,
              colorClassName: "bg-foreground",
            },
          ]}
        />
      </section>
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Trophy aria-hidden className="size-4.5 text-primary" />
          Klasyfikacje najlepszych zawodników
        </h2>
        <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
          <RankingCard
            title="Liczba rozegranych turniejów"
            rows={countRows(topByTournamentsPlayed(rows.players, rows.roster), tournamentForms)}
          />
          <RankingCard
            title="Liczba wygranych turniejów"
            rows={countRows(topByTournamentWins(rows.players, rows.standings), winForms)}
          />
          <RankingCard
            title="Najwięcej wygranych partii"
            rows={countRows(topByWins(rows.players, rows.games), gameForms)}
          />
          <RankingCard
            title="Najlepszy procent zwycięstw"
            rows={winRateRows(topByWinRate(rows.players, rows.games))}
          />
        </div>
      </section>
    </PageShell>
  );
}

function RankingCard({ title, rows }: { title: string; rows: PlayersStatisticsRow[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p>Brak zawodników.</p>
        ) : (
          <PlayersRanking
            bars
            rows={rows.map((row) => ({
              id: row.id,
              position: row.ranking,
              slug: row.slug,
              name: row.name,
              value: row.value,
              score: row.score,
            }))}
          />
        )}
      </CardContent>
    </Card>
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
