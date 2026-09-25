export type DateRange = {
  from?: string;
  to?: string;
};

export type StatsPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
};

export type StatsGameResult =
  | "white_win"
  | "black_win"
  | "draw"
  | "white_win_forfeit"
  | "black_win_forfeit"
  | "unplayed"
  | "bye";

export type StatsGame = {
  heldOn: string;
  whitePlayerId: string | null;
  blackPlayerId: string | null;
  result: StatsGameResult;
};

export type StatsRosterEntry = {
  heldOn: string;
  playerId: string;
};

export type StatsStanding = {
  heldOn: string;
  playerId: string;
  position: number;
};

export type StatsRows = {
  tournamentCount: number;
  players: StatsPlayer[];
  games: StatsGame[];
  roster: StatsRosterEntry[];
  standings: StatsStanding[];
};

export type PlayerRank = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  fullName: string;
  value: number;
};

export type WinRateRank = PlayerRank & {
  wins: number;
  played: number;
};
