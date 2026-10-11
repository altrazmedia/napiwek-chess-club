"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { formatPoints } from "@/lib/format-points";
import { routes } from "@/lib/routes";
import { playerMatchKey } from "@/lib/trf/names";
import { parseTrf, TrfParseError, type ParsedTrf, type ParsedTrfGame } from "@/lib/trf/parse";
import {
  normalizeChessManagerUrl,
  reviewValidationError,
  type PlayerResolution,
  type ReviewPlayer,
} from "@/lib/trf/review";
import { saveUploadedTournament } from "./actions";

type RowChoice =
  { mode: "existing"; playerId: string } | { mode: "new"; firstName: string; lastName: string };

type ReviewRow = {
  startNumber: number;
  firstName: string;
  lastName: string;
  points: string;
  position: number;
  found: boolean;
  choice: RowChoice;
};

type ReviewState = {
  trf: string;
  name: string;
  heldOn: string;
  chessManagerUrl: string;
  rows: ReviewRow[];
  games: ParsedTrfGame[];
};

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function UploadForm({ players }: { players: ReviewPlayer[] }) {
  const router = useRouter();
  const [review, setReview] = useState<ReviewState | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slug: string; name: string } | null>(null);
  const [pending, setPending] = useState(false);
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setSuccess(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        setError(null);
        setReview(buildReview(text, parseTrf(text), players));
      } catch (err) {
        setReview(null);
        setError(
          err instanceof TrfParseError
            ? polishParseError(err.message)
            : "Nie udało się odczytać pliku TRF.",
        );
      }
    };
    reader.onerror = () => {
      setReview(null);
      setError("Nie udało się odczytać pliku.");
    };
    reader.readAsText(file);
  }

  function cancel() {
    setReview(null);
    setToken("");
    setError(null);
    setSuccess(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!review || pending) {
      return;
    }

    const resolutions = review.rows.map(toResolution);
    const chessManager = normalizeChessManagerUrl(review.chessManagerUrl);
    const validationError =
      (chessManager.ok ? null : chessManager.error) ??
      reviewValidationError({
        name: review.name,
        heldOn: review.heldOn,
        startNumbers: review.rows.map((row) => row.startNumber),
        resolutions,
        dbPlayers: players,
      }) ??
      (token.trim() ? null : "Podaj token.");
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = await saveUploadedTournament({
        token: token.trim(),
        trf: review.trf,
        name: review.name,
        heldOn: review.heldOn,
        chessManagerUrl: review.chessManagerUrl,
        players: resolutions,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReview(null);
      setToken("");
      setSuccess({ slug: result.slug, name: result.name });
      router.refresh();
    } catch {
      setError("Nie udało się zapisać turnieju.");
    } finally {
      setPending(false);
    }
  }

  if (!review) {
    return (
      <div className="mt-6">
        {error ? (
          <p className="mb-4" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-4">
            Zapisano turniej.{" "}
            <Link href={routes.tournament(success.slug)} className="hover:underline">
              {success.name}
            </Link>
          </p>
        ) : null}
        <label className="inline-flex h-8 cursor-pointer items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Wybierz plik TRF
          <input type="file" accept=".trf,.txt,text/plain" className="sr-only" onChange={onFile} />
        </label>
      </div>
    );
  }

  const rounds = groupGames(review.games);
  const labels = new Map(review.rows.map((row) => [row.startNumber, rowLabel(row, playersById)]));

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <fieldset disabled={pending} className="min-w-0 border-0 p-0">
        <div className="flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="tournament-name">
            Nazwa
            <Input
              id="tournament-name"
              value={review.name}
              onChange={(event) => setReview({ ...review, name: event.target.value })}
            />
          </label>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="tournament-date">
              Data
            </label>
            <Input
              id="tournament-date"
              type="date"
              value={review.heldOn}
              onChange={(event) => setReview({ ...review, heldOn: event.target.value })}
            />
            <p className="text-sm text-muted-foreground">Publiczny adres turnieju to ta data.</p>
          </div>
          <label
            className="flex flex-col gap-2 text-sm font-medium"
            htmlFor="tournament-chess-manager"
          >
            Adres Chess Manager
            <Input
              id="tournament-chess-manager"
              type="url"
              value={review.chessManagerUrl}
              onChange={(event) => setReview({ ...review, chessManagerUrl: event.target.value })}
            />
          </label>
        </div>

        <h2 className="mt-8 text-lg font-semibold">Zawodnicy</h2>
        <div className="mt-4 flex flex-col gap-6">
          {review.rows.map((row) => (
            <PlayerRow
              key={row.startNumber}
              row={row}
              players={players}
              onChoice={(choice) =>
                setReview({
                  ...review,
                  rows: review.rows.map((item) =>
                    item.startNumber === row.startNumber ? { ...item, choice } : item,
                  ),
                })
              }
            />
          ))}
        </div>

        <h2 className="mt-8 text-lg font-semibold">Partie</h2>
        {rounds.length === 0 ? (
          <p className="mt-4">Nie ma partii w tym pliku.</p>
        ) : (
          rounds.map((round) => (
            <section key={round.round} className="mt-4">
              <h3 className="font-medium">Runda {round.round}</h3>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-2">
                {round.games.map((game, index) => (
                  <GameLine
                    key={`${game.round}-${game.whiteStartNumber ?? "x"}-${game.blackStartNumber ?? "x"}-${index}`}
                    game={game}
                    labels={labels}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        <div className="mt-8 flex max-w-xl flex-col gap-4">
          {error ? <p role="alert">{error}</p> : null}
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="upload-token">
            Token
            <Input
              id="upload-token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="h-8 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Zapisywanie…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="h-8 rounded-lg border border-input px-3 text-sm font-medium"
            >
              Anuluj
            </button>
          </div>
        </div>
      </fieldset>
    </form>
  );
}

function PlayerRow({
  row,
  players,
  onChoice,
}: {
  row: ReviewRow;
  players: ReviewPlayer[];
  onChoice: (choice: RowChoice) => void;
}) {
  const selectId = `player-${row.startNumber}`;
  const value = row.choice.mode === "new" ? "new" : row.choice.playerId;

  return (
    <div className="flex max-w-xl flex-col gap-2">
      <p>
        {row.position}. {row.firstName} {row.lastName} · {formatPoints(row.points)} pkt
      </p>
      <p className="text-sm text-muted-foreground">
        {row.found ? "Znaleziono w bazie" : "Nie znaleziono w bazie"}
      </p>
      <label className="sr-only" htmlFor={selectId}>
        Zawodnik {row.firstName} {row.lastName}
      </label>
      <select
        id={selectId}
        className={selectClassName}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "new") {
            onChoice({ mode: "new", firstName: row.firstName, lastName: row.lastName });
            return;
          }
          onChoice({ mode: "existing", playerId: next });
        }}
      >
        <option value="new">Nowy zawodnik</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.lastName} {player.firstName}
          </option>
        ))}
      </select>
      {row.choice.mode === "new" ? (
        <NewPlayerNames
          startNumber={row.startNumber}
          firstName={row.choice.firstName}
          lastName={row.choice.lastName}
          onChange={(firstName, lastName) => onChoice({ mode: "new", firstName, lastName })}
        />
      ) : null}
    </div>
  );
}

function NewPlayerNames({
  startNumber,
  firstName,
  lastName,
  onChange,
}: {
  startNumber: number;
  firstName: string;
  lastName: string;
  onChange: (firstName: string, lastName: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={`first-${startNumber}`}>
        Imię
        <Input
          id={`first-${startNumber}`}
          value={firstName}
          onChange={(event) => onChange(event.target.value, lastName)}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium" htmlFor={`last-${startNumber}`}>
        Nazwisko
        <Input
          id={`last-${startNumber}`}
          value={lastName}
          onChange={(event) => onChange(firstName, event.target.value)}
        />
      </label>
    </div>
  );
}

function GameLine({ game, labels }: { game: ParsedTrfGame; labels: Map<number, string> }) {
  if (game.result === "bye") {
    const startNumber = game.whiteStartNumber ?? game.blackStartNumber;
    return (
      <div className="col-span-3 grid grid-cols-subgrid items-start gap-x-3">
        <div className="min-w-0 text-right">
          {startNumber === null ? null : labels.get(startNumber)}
        </div>
        <div className="text-center">(bye)</div>
        <div />
      </div>
    );
  }

  const whiteWins = game.result === "white_win" || game.result === "white_win_forfeit";
  const blackWins = game.result === "black_win" || game.result === "black_win_forfeit";
  const forfeit = game.result === "white_win_forfeit" || game.result === "black_win_forfeit";

  return (
    <div className="col-span-3 grid grid-cols-subgrid items-start gap-x-3">
      <div className={`min-w-0 text-right ${whiteWins ? "font-bold" : ""}`}>
        {game.whiteStartNumber === null ? null : labels.get(game.whiteStartNumber)}
      </div>
      <div className="text-center">
        <div>{scoreLabel(game.result)}</div>
        {forfeit ? <div className="text-xs text-muted-foreground">walkower</div> : null}
      </div>
      <div className={`min-w-0 text-left ${blackWins ? "font-bold" : ""}`}>
        {game.blackStartNumber === null ? null : labels.get(game.blackStartNumber)}
      </div>
    </div>
  );
}

function scoreLabel(result: ParsedTrfGame["result"]): string {
  switch (result) {
    case "white_win":
    case "white_win_forfeit":
      return "1 - 0";
    case "black_win":
    case "black_win_forfeit":
      return "0 - 1";
    case "draw":
      return "½ - ½";
    case "bye":
      return "(bye)";
    case "unplayed":
      return "nie rozegrano";
  }
}

function buildReview(trf: string, parsed: ParsedTrf, players: ReviewPlayer[]): ReviewState {
  const byKey = new Map(
    players.map((player) => [playerMatchKey(player.firstName, player.lastName), player]),
  );

  const rows = [...parsed.players]
    .sort((a, b) => a.position - b.position || a.startNumber - b.startNumber)
    .map((player) => {
      const matched = byKey.get(playerMatchKey(player.firstName, player.lastName)) ?? null;
      const choice: RowChoice = matched
        ? { mode: "existing", playerId: matched.id }
        : { mode: "new", firstName: player.firstName, lastName: player.lastName };
      return {
        startNumber: player.startNumber,
        firstName: player.firstName,
        lastName: player.lastName,
        points: player.points,
        position: player.position,
        found: matched !== null,
        choice,
      };
    });

  return {
    trf,
    name: parsed.name,
    heldOn: parsed.heldOn,
    chessManagerUrl: "",
    rows,
    games: parsed.games,
  };
}

function toResolution(row: ReviewRow): PlayerResolution {
  if (row.choice.mode === "existing") {
    return { startNumber: row.startNumber, kind: "existing", playerId: row.choice.playerId };
  }
  return {
    startNumber: row.startNumber,
    kind: "new",
    firstName: row.choice.firstName,
    lastName: row.choice.lastName,
  };
}

function rowLabel(row: ReviewRow, playersById: Map<string, ReviewPlayer>): string {
  if (row.choice.mode === "existing") {
    const player = playersById.get(row.choice.playerId);
    if (player) {
      return `${player.firstName} ${player.lastName}`;
    }
  }
  if (row.choice.mode === "new") {
    const name = `${row.choice.firstName.trim()} ${row.choice.lastName.trim()}`.trim();
    if (name) {
      return name;
    }
  }
  return `${row.firstName} ${row.lastName}`;
}

function groupGames(games: ParsedTrfGame[]) {
  const rounds: { round: number; games: ParsedTrfGame[] }[] = [];
  for (const game of games) {
    const last = rounds.at(-1);
    if (!last || last.round !== game.round) {
      rounds.push({ round: game.round, games: [game] });
    } else {
      last.games.push(game);
    }
  }
  return rounds;
}

function polishParseError(message: string): string {
  if (message.startsWith("Missing tournament name")) {
    return "W pliku brakuje nazwy turnieju.";
  }
  if (message.startsWith("Missing start date")) {
    return "W pliku brakuje daty turnieju.";
  }
  if (message.startsWith("No players found")) {
    return "W pliku nie ma zawodników.";
  }
  if (message.startsWith("Invalid TRF date")) {
    return "Nieprawidłowa data w pliku.";
  }
  return "Nie udało się odczytać pliku TRF.";
}
