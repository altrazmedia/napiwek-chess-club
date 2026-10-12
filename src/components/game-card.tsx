import Link from "next/link";
import { cn } from "cn";

export type GameCardPlayer = {
  firstName: string;
  lastName: string;
  href: string;
};

export type GameCardResult =
  | "white_win"
  | "black_win"
  | "draw"
  | "white_win_forfeit"
  | "black_win_forfeit"
  | "unplayed"
  | "bye";

type PieceColor = "white" | "black";

const dotClassName = {
  white: "size-3 shrink-0 rounded-full bg-card shadow-sm ring-1 ring-border",
  black: "size-3 shrink-0 rounded-full bg-foreground",
} as const;

const colorLabel = {
  white: "Białe",
  black: "Czarne",
} as const;

export function GameCard({
  white,
  black,
  result,
  description,
}: {
  white: GameCardPlayer | null;
  black: GameCardPlayer | null;
  result: GameCardResult;
  description?: string;
}) {
  const seats = seatsFor(white, black, result);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-(--gradient-1)/60 p-4">
      {description ? (
        <p className="text-xs font-semibold tracking-wide text-primary">{description}</p>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <PlayerSide player={seats.left} color={seats.leftColor} align="left" />
        <Score result={result} />
        <PlayerSide player={seats.right} color={seats.rightColor} align="right" />
      </div>
    </div>
  );
}

function seatsFor(
  white: GameCardPlayer | null,
  black: GameCardPlayer | null,
  result: GameCardResult,
) {
  if (result === "bye") {
    if (white) {
      return { left: white, leftColor: "white" as const, right: null, rightColor: null };
    }
    return { left: black, leftColor: "black" as const, right: null, rightColor: null };
  }

  return {
    left: white,
    leftColor: "white" as const,
    right: black,
    rightColor: "black" as const,
  };
}

function PlayerSide({
  player,
  color,
  align,
}: {
  player: GameCardPlayer | null;
  color: PieceColor | null;
  align: "left" | "right";
}) {
  if (!player || !color) {
    return <div />;
  }

  const name = (
    <Link
      href={player.href}
      className={cn("min-w-0 overflow-hidden hover:underline", align === "right" && "text-right")}
    >
      <span className="sr-only">{colorLabel[color]}</span>
      <span className="block truncate text-xs text-muted-foreground">{player.firstName}</span>
      <span className="block truncate text-sm font-semibold">{player.lastName}</span>
    </Link>
  );
  const dot = <span aria-hidden="true" className={dotClassName[color]} />;

  if (align === "right") {
    return (
      <div className="flex min-w-0 items-center justify-end gap-2">
        {name}
        {dot}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {dot}
      {name}
    </div>
  );
}

function Score({ result }: { result: GameCardResult }) {
  if (result === "bye" || result === "unplayed") {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {result === "bye" ? "(bye)" : "nie rozegrano"}
      </p>
    );
  }

  const forfeit = result === "white_win_forfeit" || result === "black_win_forfeit";
  const decisive = result !== "draw";
  const label =
    result === "black_win" || result === "black_win_forfeit"
      ? "0 - 1"
      : result === "draw"
        ? "½ - ½"
        : "1 - 0";

  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className={cn(
          "rounded-xl px-2.5 py-1 text-sm font-semibold",
          decisive ? "bg-primary text-primary-foreground" : "bg-(--gradient-1) text-foreground",
        )}
      >
        {label}
      </p>
      {forfeit ? <p className="text-xs text-muted-foreground">walkower</p> : null}
    </div>
  );
}
