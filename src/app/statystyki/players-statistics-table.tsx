import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { routes } from "@/lib/routes";

export type PlayersStatisticsRow = {
  id: string;
  slug: string;
  name: string;
  value: string;
};

export function PlayersStatisticsTable({
  valueHeader,
  rows,
}: {
  valueHeader: string;
  rows: PlayersStatisticsRow[];
}) {
  if (rows.length === 0) {
    return <p className="mt-3">Brak zawodników.</p>;
  }

  return (
    <div className="mt-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zawodnik</TableHead>
            <TableHead>{valueHeader}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link href={routes.player(row.slug)} className="hover:underline">
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
