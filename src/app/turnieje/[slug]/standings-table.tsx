import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { cn } from "cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TournamentStanding } from "@/lib/db/queries/tournaments";
import { formatPoints } from "@/lib/format-points";
import { routes } from "@/lib/routes";
import type { TournamentPlayerRecord } from "@/lib/stats/tournament";
import { TournamentSection } from "./tournament-section";

type StandingRow = TournamentStanding & {
  record: TournamentPlayerRecord;
};

const headerCellClassName =
  "h-auto bg-(--gradient-1)/70 px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase";

const rowClassName = {
  1: "bg-(--gold-background) hover:bg-(--gold-background)",
  2: "bg-(--silver-background) hover:bg-(--silver-background)",
  3: "bg-(--bronze-background) hover:bg-(--bronze-background)",
} as const;

const badgeClassName = {
  1: "bg-(--gold) text-(--gold-foreground)",
  2: "bg-(--silver) text-(--silver-foreground)",
  3: "bg-(--bronze) text-(--bronze-foreground)",
} as const;

function medalPlace(position: number): 1 | 2 | 3 | null {
  if (position === 1 || position === 2 || position === 3) {
    return position;
  }

  return null;
}

function RecordValue({ record }: { record: TournamentPlayerRecord }) {
  const wins =
    record.unplayedWins > 0 ? `+${record.wins}(${record.unplayedWins})` : `+${record.wins}`;

  return (
    <span className="inline-flex items-baseline justify-center gap-0.5 text-sm">
      <span className="font-semibold text-green">{wins}</span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground">={record.draws}</span>
      <span className="text-muted-foreground">/</span>
      <span className="font-semibold text-destructive">-{record.losses}</span>
    </span>
  );
}

export function StandingsTable({ standings }: { standings: StandingRow[] }) {
  return (
    <TournamentSection
      className="w-full min-w-0 lg:w-3/5 lg:shrink-0"
      header={
        <>
          <ListOrdered aria-hidden="true" className="size-5 shrink-0 text-primary" />
          Klasyfikacja końcowa
        </>
      }
    >
      {standings.length === 0 ? (
        <p>Brak klasyfikacji.</p>
      ) : (
        <Table className="border-separate border-spacing-0">
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="border-0">
              <TableHead className={cn(headerCellClassName, "w-16 rounded-l-lg text-center")}>
                #
              </TableHead>
              <TableHead className={headerCellClassName}>Zawodnik</TableHead>
              <TableHead className={cn(headerCellClassName, "w-24 text-center")}>Pkt</TableHead>
              <TableHead className={cn(headerCellClassName, "rounded-r-lg text-center")}>
                Bilans (+(<span className="normal-case">bye</span>) / = / -)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((standing, index) => {
              const place = medalPlace(standing.position);
              const divided = index === 0 ? undefined : "border-t border-(--gradient-1)";

              return (
                <TableRow
                  key={standing.player.id}
                  className={cn(
                    "border-0",
                    place === null ? "hover:bg-transparent" : rowClassName[place],
                  )}
                >
                  <TableCell className={cn("w-16 px-4 py-5 text-center", divided)}>
                    {place === null ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {standing.position}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                          badgeClassName[place],
                        )}
                      >
                        {standing.position}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={cn("px-4 py-5", divided)}>
                    <Link
                      href={routes.player(standing.player.slug)}
                      className="text-sm font-medium hover:underline"
                    >
                      {standing.player.firstName} {standing.player.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className={cn("w-24 p-0 text-center", divided)}>
                    <div className={cn("px-4 py-5")}>{formatPoints(standing.points)}</div>
                  </TableCell>
                  <TableCell className={cn("px-4 py-5 text-center", divided)}>
                    <RecordValue record={standing.record} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </TournamentSection>
  );
}
