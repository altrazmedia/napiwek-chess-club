import type { DateRange, StatsGameResult } from "./types";

const OPPONENT_LIMIT = 3;
const POINTS_SHARE_MIN_TOURNAMENTS = 3;

const playedResults = new Set<StatsGameResult>(["white_win", "black_win", "draw"]);

export type PlayerGame = {
  heldOn: string;
  result: StatsGameResult;
  color: "white" | "black";
  opponent: {
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
  } | null;
};

export type PlayerTournament = {
  slug: string;
  name: string;
  heldOn: string;
  position: number;
  points: string;
  rounds: number;
};

export type ColorRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
};

export type PlayerColorRecords = {
  overall: ColorRecord;
  white: ColorRecord;
  black: ColorRecord;
};

export type PlayerTournamentSummary = {
  wins: number;
  podiums: number;
  tournaments: PlayerTournament[];
};

export type PlayerPointsSharePoint = {
  slug: string;
  name: string;
  heldOn: string;
  points: string;
  rounds: number;
  share: number;
};

export type FrequentOpponent = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  games: number;
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

function emptyRecord(): ColorRecord {
  return { played: 0, wins: 0, draws: 0, losses: 0 };
}

function compareNames(
  a: { lastName: string; firstName: string; slug: string },
  b: { lastName: string; firstName: string; slug: string },
) {
  return (
    a.lastName.localeCompare(b.lastName, "pl") ||
    a.firstName.localeCompare(b.firstName, "pl") ||
    a.slug.localeCompare(b.slug, "pl")
  );
}

export function playerColorRecord(games: PlayerGame[], range?: DateRange): PlayerColorRecords {
  const overall = emptyRecord();
  const white = emptyRecord();
  const black = emptyRecord();

  for (const game of games) {
    if (!inRange(game.heldOn, range) || !playedResults.has(game.result)) {
      continue;
    }

    const bucket = game.color === "white" ? white : black;
    const won =
      (game.color === "white" && game.result === "white_win") ||
      (game.color === "black" && game.result === "black_win");

    for (const record of [bucket, overall]) {
      record.played += 1;
      if (game.result === "draw") {
        record.draws += 1;
      } else if (won) {
        record.wins += 1;
      } else {
        record.losses += 1;
      }
    }
  }

  return { overall, white, black };
}

export function playerTournamentSummary(
  tournaments: PlayerTournament[],
  range?: DateRange,
): PlayerTournamentSummary {
  const inWindow = tournaments
    .filter((tournament) => inRange(tournament.heldOn, range))
    .sort((a, b) => b.heldOn.localeCompare(a.heldOn) || a.slug.localeCompare(b.slug, "pl"));

  let wins = 0;
  let podiums = 0;
  for (const tournament of inWindow) {
    if (tournament.position === 1) {
      wins += 1;
    }
    if (tournament.position <= 3) {
      podiums += 1;
    }
  }

  return { wins, podiums, tournaments: inWindow };
}

export function playerPointsShare(
  tournaments: PlayerTournament[],
  range?: DateRange,
): PlayerPointsSharePoint[] | null {
  const inWindow = tournaments
    .filter((tournament) => inRange(tournament.heldOn, range))
    .sort((a, b) => a.heldOn.localeCompare(b.heldOn) || a.slug.localeCompare(b.slug, "pl"));

  if (inWindow.length < POINTS_SHARE_MIN_TOURNAMENTS) {
    return null;
  }

  return inWindow.map((tournament) => ({
    slug: tournament.slug,
    name: tournament.name,
    heldOn: tournament.heldOn,
    points: tournament.points,
    rounds: tournament.rounds,
    share: tournament.rounds === 0 ? 0 : (Number(tournament.points) / tournament.rounds) * 100,
  }));
}

export function frequentOpponents(
  games: PlayerGame[],
  tournaments: { heldOn: string }[],
  range?: DateRange,
): FrequentOpponent[] | null {
  const rosterCount = tournaments.filter((tournament) => inRange(tournament.heldOn, range)).length;
  if (rosterCount < 3) {
    return null;
  }

  const counts = new Map<string, FrequentOpponent>();
  for (const game of games) {
    if (!inRange(game.heldOn, range) || !playedResults.has(game.result) || !game.opponent) {
      continue;
    }

    const existing = counts.get(game.opponent.id);
    if (existing) {
      existing.games += 1;
    } else {
      counts.set(game.opponent.id, { ...game.opponent, games: 1 });
    }
  }

  const sorted = [...counts.values()].sort((a, b) => {
    const byGames = b.games - a.games;
    if (byGames !== 0) {
      return byGames;
    }
    return compareNames(a, b);
  });

  if (sorted.length <= OPPONENT_LIMIT) {
    return sorted;
  }

  const cutoff = sorted[OPPONENT_LIMIT - 1].games;
  return sorted.filter((opponent) => opponent.games >= cutoff);
}
