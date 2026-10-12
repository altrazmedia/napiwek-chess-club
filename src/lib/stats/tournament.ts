import type { StatsGameResult } from "./types";

export type TournamentPlayerRecord = {
  wins: number;
  draws: number;
  losses: number;
  unplayedWins: number;
};

export type TournamentRecordGame = {
  result: StatsGameResult;
  white: { id: string } | null;
  black: { id: string } | null;
};

function emptyRecord(): TournamentPlayerRecord {
  return { wins: 0, draws: 0, losses: 0, unplayedWins: 0 };
}

export function tournamentPlayerRecords(
  games: TournamentRecordGame[],
  playerIds: Iterable<string>,
): Map<string, TournamentPlayerRecord> {
  const records = new Map<string, TournamentPlayerRecord>();

  for (const playerId of playerIds) {
    records.set(playerId, emptyRecord());
  }

  for (const game of games) {
    const whiteId = game.white?.id ?? null;
    const blackId = game.black?.id ?? null;

    switch (game.result) {
      case "white_win":
        bump(records, whiteId, "wins");
        bump(records, blackId, "losses");
        break;
      case "black_win":
        bump(records, blackId, "wins");
        bump(records, whiteId, "losses");
        break;
      case "draw":
        bump(records, whiteId, "draws");
        bump(records, blackId, "draws");
        break;
      case "bye":
        bump(records, onlyPlayer(whiteId, blackId), "unplayedWins");
        break;
      case "white_win_forfeit":
        bump(records, whiteId, "unplayedWins");
        break;
      case "black_win_forfeit":
        bump(records, blackId, "unplayedWins");
        break;
      case "unplayed":
        break;
    }
  }

  return records;
}

function onlyPlayer(whiteId: string | null, blackId: string | null) {
  if (whiteId != null && blackId == null) {
    return whiteId;
  }
  if (blackId != null && whiteId == null) {
    return blackId;
  }
  return null;
}

function bump(
  records: Map<string, TournamentPlayerRecord>,
  playerId: string | null,
  field: keyof TournamentPlayerRecord,
) {
  if (playerId == null) {
    return;
  }

  const record = records.get(playerId);
  if (!record) {
    return;
  }

  record[field] += 1;
}
