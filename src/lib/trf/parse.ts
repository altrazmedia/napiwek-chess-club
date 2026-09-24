import { parsePlayerName } from "./names";
import { playerSlugFromNames, tournamentSlugFromDate } from "./slug";

export type GameResult =
  | "white_win"
  | "black_win"
  | "draw"
  | "white_win_forfeit"
  | "black_win_forfeit"
  | "unplayed"
  | "bye";

export type ParsedTrfPlayer = {
  startNumber: number;
  firstName: string;
  lastName: string;
  slug: string;
  points: string;
  position: number;
};

export type ParsedTrfGame = {
  round: number;
  /** TRF start number; null for bye / unpaired seat. */
  whiteStartNumber: number | null;
  blackStartNumber: number | null;
  result: GameResult;
};

export type ParsedTrf = {
  name: string;
  heldOn: string;
  slug: string;
  players: ParsedTrfPlayer[];
  games: ParsedTrfGame[];
};

export class TrfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrfParseError";
  }
}

type RawPairing = {
  round: number;
  opponent: number; // 0 = unpaired
  color: "w" | "b" | "-";
  resultCode: string;
};

type RawPlayer = {
  startNumber: number;
  firstName: string;
  lastName: string;
  slug: string;
  points: string;
  position: number;
  pairings: RawPairing[];
};

export function parseTrf(text: string): ParsedTrf {
  // ChessManager / Windows exports sometimes prefix a UTF-8 BOM.
  const normalized = text.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);
  let name: string | undefined;
  let heldOn: string | undefined;
  const rawPlayers: RawPlayer[] = [];

  for (const line of lines) {
    if (!line.trim() || line.startsWith("###")) {
      continue;
    }

    // Header codes may have leading spaces; player lines stay fixed-width from col 1.
    const header = line.trimStart();
    const code = header.slice(0, 3);
    if (code === "012") {
      name = header.slice(4).trim();
      continue;
    }
    if (code === "042") {
      heldOn = parseTrfDate(header.slice(4).trim());
      continue;
    }
    if (line.slice(0, 3) === "001") {
      rawPlayers.push(parsePlayerLine(line));
    }
  }

  if (!name) {
    const preview = lines.find((l) => l.trim())?.slice(0, 40) ?? "(empty)";
    throw new TrfParseError(`Missing tournament name (012); first line was: ${preview}`);
  }
  if (!heldOn) {
    throw new TrfParseError("Missing start date (042)");
  }
  if (rawPlayers.length === 0) {
    throw new TrfParseError("No players found (001 lines)");
  }

  uniquifyPositions(rawPlayers);

  const byStart = new Map(rawPlayers.map((p) => [p.startNumber, p]));
  const games = buildGames(rawPlayers, byStart);

  return {
    name,
    heldOn,
    slug: tournamentSlugFromDate(heldOn),
    players: rawPlayers.map((player) => ({
      startNumber: player.startNumber,
      firstName: player.firstName,
      lastName: player.lastName,
      slug: player.slug,
      points: player.points,
      position: player.position,
    })),
    games,
  };
}

/** Schema requires unique place per tournament; TRF may repeat ranks (e.g. withdrawn). */
function uniquifyPositions(players: RawPlayer[]): void {
  const ordered = [...players].sort(
    (a, b) => a.position - b.position || a.startNumber - b.startNumber,
  );
  const used = new Set<number>();
  for (const player of ordered) {
    let position = player.position;
    while (used.has(position)) {
      position += 1;
    }
    used.add(position);
    player.position = position;
  }
}

function parseTrfDate(raw: string): string {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(raw.trim());
  if (!match) {
    throw new TrfParseError(`Invalid TRF date (expected YYYY/MM/DD): ${raw}`);
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function parsePlayerLine(line: string): RawPlayer {
  // TRF16 1-based columns → 0-based slice ends are exclusive.
  const startNumber = Number.parseInt(line.slice(4, 8).trim(), 10);
  if (!Number.isFinite(startNumber) || startNumber < 1) {
    throw new TrfParseError(`Invalid starting rank on line: ${line.slice(0, 40)}…`);
  }

  const nameRaw = line.slice(14, 47).trim();
  let firstName: string;
  let lastName: string;
  try {
    ({ firstName, lastName } = parsePlayerName(nameRaw));
  } catch (err) {
    throw new TrfParseError(err instanceof Error ? err.message : String(err));
  }

  // ChessManager sometimes widens the name field, which shifts every later column.
  // Birth date stays YYYY/MM/DD, so points, rank, and pairings are read from there.
  const birthDate = /\d{4}\/\d{2}\/\d{2}/.exec(line);
  if (!birthDate) {
    throw new TrfParseError(`Missing birth date for player ${startNumber}`);
  }
  const afterBirthDate = birthDate.index + birthDate[0].length;

  const pointsRaw = line.slice(afterBirthDate + 1, afterBirthDate + 5).trim();
  const points = normalizePoints(pointsRaw);
  const position = Number.parseInt(line.slice(afterBirthDate + 6, afterBirthDate + 10).trim(), 10);
  if (!Number.isFinite(position) || position < 1) {
    throw new TrfParseError(`Invalid rank for player ${startNumber}`);
  }

  const pairings = parsePairings(line.slice(afterBirthDate + 12), startNumber);

  return {
    startNumber,
    firstName,
    lastName,
    slug: playerSlugFromNames(firstName, lastName),
    points,
    position,
    pairings,
  };
}

function normalizePoints(raw: string): string {
  if (!raw) {
    throw new TrfParseError("Missing points on player line");
  }
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    throw new TrfParseError(`Invalid points: ${raw}`);
  }
  // numeric(5,1) as string
  return value.toFixed(1);
}

function parsePairings(tail: string, startNumber: number): RawPairing[] {
  const pairings: RawPairing[] = [];
  // Each round block is 10 chars: "  6 b 1  " style (opp 4, color 1, result 1 with spaces).
  let round = 1;
  let i = 0;
  while (i + 8 <= tail.length) {
    const block = tail.slice(i, i + 10);
    const oppRaw = block.slice(0, 4).trim();
    const colorRaw = block.slice(5, 6).trim().toLowerCase();
    const resultRaw = block.slice(7, 8).trim().toUpperCase();

    // Trailing empty blocks mean no more rounds.
    if (!oppRaw && !colorRaw && !resultRaw) {
      break;
    }

    const opponent = oppRaw === "" ? 0 : Number.parseInt(oppRaw, 10);
    if (!Number.isFinite(opponent) || opponent < 0) {
      throw new TrfParseError(`Invalid opponent for player ${startNumber} round ${round}`);
    }

    let color: "w" | "b" | "-";
    if (colorRaw === "w" || colorRaw === "b") {
      color = colorRaw;
    } else {
      color = "-";
    }

    const resultCode = resultRaw === "" ? "Z" : resultRaw;

    pairings.push({ round, opponent, color, resultCode });
    round += 1;
    i += 10;
  }
  return pairings;
}

function buildGames(players: RawPlayer[], byStart: Map<number, RawPlayer>): ParsedTrfGame[] {
  const seen = new Set<string>();
  const games: ParsedTrfGame[] = [];

  for (const player of players) {
    for (const pairing of player.pairings) {
      if (pairing.opponent === 0) {
        const key = `bye:${pairing.round}:${player.startNumber}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const result = mapUnpairedResult(pairing.resultCode);
        games.push({
          round: pairing.round,
          whiteStartNumber: player.startNumber,
          blackStartNumber: null,
          result,
        });
        continue;
      }

      const a = Math.min(player.startNumber, pairing.opponent);
      const b = Math.max(player.startNumber, pairing.opponent);
      const key = `g:${pairing.round}:${a}:${b}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (!byStart.has(pairing.opponent)) {
        throw new TrfParseError(
          `Unknown opponent ${pairing.opponent} for player ${player.startNumber} round ${pairing.round}`,
        );
      }

      const oriented = orientPlayedGame(player.startNumber, pairing);
      games.push(oriented);
    }
  }

  games.sort((x, y) => x.round - y.round || (x.whiteStartNumber ?? 0) - (y.whiteStartNumber ?? 0));
  return games;
}

function mapUnpairedResult(code: string): GameResult {
  switch (code.toUpperCase()) {
    case "F":
    case "U":
    case "H":
    case "Z":
      return "bye";
    default:
      // Unknown unpaired codes still recorded as bye (points live in standings).
      return "bye";
  }
}

function orientPlayedGame(startNumber: number, pairing: RawPairing): ParsedTrfGame {
  const code = pairing.resultCode.toUpperCase();
  const isWhite = pairing.color === "w";

  if (pairing.color !== "w" && pairing.color !== "b") {
    throw new TrfParseError(
      `Missing color for played game: player ${startNumber} round ${pairing.round}`,
    );
  }

  const whiteStart = isWhite ? startNumber : pairing.opponent;
  const blackStart = isWhite ? pairing.opponent : startNumber;

  const result = mapPlayedResult(code, isWhite);
  return {
    round: pairing.round,
    whiteStartNumber: whiteStart,
    blackStartNumber: blackStart,
    result,
  };
}

function mapPlayedResult(code: string, fromWhiteSeat: boolean): GameResult {
  const asWhitePerspective = (whiteResult: GameResult, blackResult: GameResult): GameResult =>
    fromWhiteSeat ? whiteResult : blackResult;

  switch (code) {
    case "1":
    case "W":
      return asWhitePerspective("white_win", "black_win");
    case "0":
    case "L":
      return asWhitePerspective("black_win", "white_win");
    case "=":
    case "D":
      return "draw";
    case "+":
      return asWhitePerspective("white_win_forfeit", "black_win_forfeit");
    case "-":
      return asWhitePerspective("black_win_forfeit", "white_win_forfeit");
    default:
      throw new TrfParseError(`Unsupported result code: ${code}`);
  }
}
