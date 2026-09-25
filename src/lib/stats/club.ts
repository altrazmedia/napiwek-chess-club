import type {
  DateRange,
  PlayerRank,
  StatsGame,
  StatsPlayer,
  StatsRosterEntry,
  StatsStanding,
  WinRateRank,
} from "./types";

const TOP_LIMIT = 5;
const MIN_GAMES_FOR_WIN_RATE = 15;

const playedResults = new Set<StatsGame["result"]>(["white_win", "black_win", "draw"]);

export type GlobalGameCounts = {
  games: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
};

function inRange(heldOn: string, range?: DateRange) {
  if (range?.from && heldOn < range.from) {
    return false;
  }
  if (range?.to && heldOn > range.to) {
    return false;
  }
  return true;
}

function compareNames(
  a: { lastName: string; firstName: string },
  b: { lastName: string; firstName: string },
) {
  const byLastName = a.lastName.localeCompare(b.lastName, "pl");
  if (byLastName !== 0) {
    return byLastName;
  }
  return a.firstName.localeCompare(b.firstName, "pl");
}

function takeTop<T extends { lastName: string; firstName: string }>(
  rows: T[],
  metric: (row: T) => number,
  qualifies: (row: T) => boolean,
): T[] {
  const sorted = rows.filter(qualifies).sort((a, b) => {
    const byMetric = metric(b) - metric(a);
    if (byMetric !== 0) {
      return byMetric;
    }
    return compareNames(a, b);
  });

  if (sorted.length <= TOP_LIMIT) {
    return sorted;
  }

  const cutoff = metric(sorted[TOP_LIMIT - 1]);
  return sorted.filter((row) => metric(row) >= cutoff);
}

function ranksFor(
  players: StatsPlayer[],
  counts: Map<string, number>,
  qualifies: (value: number) => boolean,
): PlayerRank[] {
  const rows = players.flatMap((player) => {
    const value = counts.get(player.id) ?? 0;
    if (!qualifies(value)) {
      return [];
    }
    return [
      {
        id: player.id,
        slug: player.slug,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        value,
      },
    ];
  });

  return takeTop(
    rows,
    (row) => row.value,
    () => true,
  );
}

export function globalGameCounts(games: StatsGame[], range?: DateRange): GlobalGameCounts {
  const counts: GlobalGameCounts = { games: 0, whiteWins: 0, blackWins: 0, draws: 0 };

  for (const game of games) {
    if (!inRange(game.heldOn, range) || !playedResults.has(game.result)) {
      continue;
    }
    counts.games += 1;
    if (game.result === "white_win") {
      counts.whiteWins += 1;
    } else if (game.result === "black_win") {
      counts.blackWins += 1;
    } else {
      counts.draws += 1;
    }
  }

  return counts;
}

export function topByTournamentsPlayed(
  players: StatsPlayer[],
  roster: StatsRosterEntry[],
  range?: DateRange,
): PlayerRank[] {
  const counts = new Map<string, number>();
  for (const entry of roster) {
    if (!inRange(entry.heldOn, range)) {
      continue;
    }
    counts.set(entry.playerId, (counts.get(entry.playerId) ?? 0) + 1);
  }
  return ranksFor(players, counts, (value) => value > 0);
}

export function topByWins(
  players: StatsPlayer[],
  games: StatsGame[],
  range?: DateRange,
): PlayerRank[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    if (!inRange(game.heldOn, range) || !playedResults.has(game.result)) {
      continue;
    }
    const winnerId =
      game.result === "white_win"
        ? game.whitePlayerId
        : game.result === "black_win"
          ? game.blackPlayerId
          : null;
    if (!winnerId) {
      continue;
    }
    counts.set(winnerId, (counts.get(winnerId) ?? 0) + 1);
  }
  return ranksFor(players, counts, (value) => value > 0);
}

export function topByWinRate(
  players: StatsPlayer[],
  games: StatsGame[],
  range?: DateRange,
): WinRateRank[] {
  const totals = new Map<string, { wins: number; played: number }>();

  function bump(playerId: string, won: boolean) {
    const current = totals.get(playerId) ?? { wins: 0, played: 0 };
    current.played += 1;
    if (won) {
      current.wins += 1;
    }
    totals.set(playerId, current);
  }

  for (const game of games) {
    if (
      !inRange(game.heldOn, range) ||
      !playedResults.has(game.result) ||
      !game.whitePlayerId ||
      !game.blackPlayerId
    ) {
      continue;
    }
    bump(game.whitePlayerId, game.result === "white_win");
    bump(game.blackPlayerId, game.result === "black_win");
  }

  const rows: WinRateRank[] = players.flatMap((player) => {
    const total = totals.get(player.id);
    if (!total || total.played < MIN_GAMES_FOR_WIN_RATE) {
      return [];
    }
    return [
      {
        id: player.id,
        slug: player.slug,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        value: total.wins / total.played,
        wins: total.wins,
        played: total.played,
      },
    ];
  });

  const sorted = rows.sort((a, b) => {
    const byRate = b.wins * a.played - a.wins * b.played;
    if (byRate !== 0) {
      return byRate;
    }
    return compareNames(a, b);
  });

  if (sorted.length <= TOP_LIMIT) {
    return sorted;
  }

  const cutoff = sorted[TOP_LIMIT - 1];
  return sorted.filter((row) => row.wins * cutoff.played >= cutoff.wins * row.played);
}

export function topByTournamentWins(
  players: StatsPlayer[],
  standings: StatsStanding[],
  range?: DateRange,
): PlayerRank[] {
  const counts = new Map<string, number>();
  for (const standing of standings) {
    if (!inRange(standing.heldOn, range) || standing.position !== 1) {
      continue;
    }
    counts.set(standing.playerId, (counts.get(standing.playerId) ?? 0) + 1);
  }
  return ranksFor(players, counts, (value) => value > 0);
}
