import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "cn";
import { routes } from "@/lib/routes";

export type PlayersRankingRow = {
  id: string;
  position: number;
  slug: string;
  name: string;
  value: ReactNode;
  score?: number;
};

const rowClassName = {
  1: "bg-(--gold-background)/80 text-(--gold-foreground) shadow-[0_1px_2px_rgba(217,119,6,0.06)]",
  2: "bg-(--silver-background) text-(--silver-foreground)",
  3: "bg-(--bronze-background)/50 text-(--bronze-foreground)",
} as const;

const badgeClassName = {
  1: "rounded-full bg-(--gold) text-(--gold-foreground)",
  2: "rounded-full bg-(--silver) text-(--silver-foreground)",
  3: "rounded-full bg-(--bronze) text-(--bronze-foreground)",
} as const;

const barRowClassName = {
  1: "bg-(--gold-background)",
  2: "bg-(--silver-background)",
  3: "bg-(--bronze-background)/60",
} as const;

const barOverlayClassName = {
  1: "bg-(--gold)/20",
  2: "bg-gradient-4",
  3: "bg-(--bronze)/30",
} as const;

function medalPlace(position: number): 1 | 2 | 3 | null {
  if (position === 1 || position === 2 || position === 3) {
    return position;
  }

  return null;
}

function barNameClassName(place: 1 | 2 | 3 | null) {
  if (place === 1) {
    return "text-base font-bold";
  }

  if (place === 2 || place === 3) {
    return "text-sm font-semibold";
  }

  return "text-sm font-normal";
}

function barValueClassName(place: 1 | 2 | 3 | null) {
  if (place === 1) {
    return "font-bold";
  }

  if (place === 2 || place === 3) {
    return "font-semibold";
  }

  return "font-medium text-muted-foreground";
}

export function PlayersRanking({
  rows,
  bars = false,
}: {
  rows: PlayersRankingRow[];
  bars?: boolean;
}) {
  if (bars) {
    return <RankingBars rows={rows} />;
  }

  return <PodiumRanking rows={rows} />;
}

function PodiumRanking({ rows }: { rows: PlayersRankingRow[] }) {
  return (
    <div className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] gap-x-2.5 gap-y-2">
      {rows.map((row) => {
        const place = medalPlace(row.position);

        return (
          <div
            key={row.id}
            className={cn(
              "col-span-3 grid grid-cols-subgrid items-center rounded-[12px] p-2",
              place === null ? "text-foreground" : rowClassName[place],
            )}
          >
            <div
              className={cn(
                "flex size-6 items-center justify-center text-xs font-semibold",
                place === null ? undefined : badgeClassName[place],
              )}
            >
              {row.position}
            </div>
            <Link
              href={routes.player(row.slug)}
              className="min-w-0 truncate px-2 text-sm font-semibold "
            >
              {row.name}
            </Link>
            <div className="text-right">{row.value}</div>
          </div>
        );
      })}
    </div>
  );
}

function RankingBars({ rows }: { rows: PlayersRankingRow[] }) {
  const maxScore = rows.reduce((max, row) => Math.max(max, row.score ?? 0), 0);

  return (
    <div className="flex w-full flex-col gap-1.5">
      {rows.map((row) => {
        const place = medalPlace(row.position);
        const score = row.score ?? 0;
        const width = maxScore > 0 ? (score / maxScore) * 100 : 0;

        return (
          <div
            key={row.id}
            className={cn(
              "relative flex items-center justify-between gap-3 overflow-hidden rounded-md p-2.5",
              place === null ? undefined : barRowClassName[place],
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 rounded-r-md",
                place === null ? "bg-(--silver-background)/70" : barOverlayClassName[place],
              )}
              style={{ width: `${width}%` }}
            />
            <div className="relative flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center text-xs font-bold",
                  place === null ? "text-muted-foreground" : badgeClassName[place],
                )}
              >
                {row.position}
              </div>
              <Link
                href={routes.player(row.slug)}
                className={cn("min-w-0 truncate", barNameClassName(place))}
              >
                {row.name}
              </Link>
            </div>
            <div className={cn("relative shrink-0 pl-2 text-sm", barValueClassName(place))}>
              {row.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
