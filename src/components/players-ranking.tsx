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
};

const rowClassName = {
  1: "bg-(--gold-background)/80 text-(--gold-foreground) shadow-[0_1px_2px_rgba(217,119,6,0.06)]",
  2: "bg-(--silver-background) text-foreground",
  3: "bg-(--bronze-background)/50 text-foreground",
} as const;

const badgeClassName = {
  1: "rounded-full bg-(--gold) text-(--gold-foreground)",
  2: "rounded-full bg-(--silver) text-(--silver-foreground)",
  3: "rounded-full bg-(--bronze) text-(--bronze-foreground)",
} as const;

function medalPlace(position: number): 1 | 2 | 3 | null {
  if (position === 1 || position === 2 || position === 3) {
    return position;
  }

  return null;
}

export function PlayersRanking({ rows }: { rows: PlayersRankingRow[] }) {
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
              className="min-w-0 truncate px-2 text-sm font-semibold"
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
