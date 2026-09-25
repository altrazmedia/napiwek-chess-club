import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TournamentStanding } from "@/lib/db/queries/tournaments";
import { routes } from "@/lib/routes";

const pointsFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function formatPoints(points: string) {
  return pointsFormat.format(Number(points));
}

export function StandingsTable({ standings }: { standings: TournamentStanding[] }) {
  return (
    <div className="mt-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miejsce</TableHead>
            <TableHead>Zawodnik</TableHead>
            <TableHead>Punkty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((standing) => (
            <TableRow key={standing.player.id}>
              <TableCell>{standing.position}</TableCell>
              <TableCell>
                <Link href={routes.player(standing.player.slug)} className="hover:underline">
                  {standing.player.firstName} {standing.player.lastName}
                </Link>
              </TableCell>
              <TableCell>{formatPoints(standing.points)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
