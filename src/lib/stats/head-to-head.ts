import type { DateRange } from "./types";

const playedResults = new Set(["white_win", "black_win", "draw"]);

export type HeadToHeadPlayer = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
};

export type HeadToHeadGame = {
  id: string;
  tournamentSlug: string;
  tournamentName: string;
  heldOn: string;
  round: number;
  result: "white_win" | "black_win" | "draw";
  white: HeadToHeadPlayer;
  black: HeadToHeadPlayer;
};

export type HeadToHeadRecord = {
  winsA: number;
  winsB: number;
  draws: number;
};

export type HeadToHeadSummary = {
  overall: HeadToHeadRecord;
  aWhite: HeadToHeadRecord;
  bWhite: HeadToHeadRecord;
  games: HeadToHeadGame[];
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

function emptyRecord(): HeadToHeadRecord {
  return { winsA: 0, winsB: 0, draws: 0 };
}

function addResult(record: HeadToHeadRecord, game: HeadToHeadGame, playerAId: string) {
  if (game.result === "draw") {
    record.draws += 1;
    return;
  }

  const winnerId = game.result === "white_win" ? game.white.id : game.black.id;
  if (winnerId === playerAId) {
    record.winsA += 1;
  } else {
    record.winsB += 1;
  }
}

function compareGames(a: HeadToHeadGame, b: HeadToHeadGame) {
  return (
    b.heldOn.localeCompare(a.heldOn) ||
    a.tournamentName.localeCompare(b.tournamentName, "pl") ||
    a.tournamentSlug.localeCompare(b.tournamentSlug, "pl") ||
    a.round - b.round ||
    a.id.localeCompare(b.id)
  );
}

export function headToHeadSummary(
  games: HeadToHeadGame[],
  playerAId: string,
  range?: DateRange,
): HeadToHeadSummary {
  const overall = emptyRecord();
  const aWhite = emptyRecord();
  const bWhite = emptyRecord();
  const inWindow: HeadToHeadGame[] = [];

  for (const game of games) {
    if (!inRange(game.heldOn, range) || !playedResults.has(game.result)) {
      continue;
    }

    inWindow.push(game);
    addResult(overall, game, playerAId);
    if (game.white.id === playerAId) {
      addResult(aWhite, game, playerAId);
    } else {
      addResult(bWhite, game, playerAId);
    }
  }

  inWindow.sort(compareGames);

  return { overall, aWhite, bWhite, games: inWindow };
}
