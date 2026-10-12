import { ChessPawn, Trophy, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { polishPlural } from "@/lib/polish-plural";
import { cn } from "cn";

const countFormat = new Intl.NumberFormat("pl-PL");

function TotalCard({
  value,
  label,
  icon: Icon,
  className,
}: {
  value: number;
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Card gradient className={cn("relative h-full", className)}>
      <CardContent className="flex flex-col gap-3">
        <p className="text-5xl leading-none font-extrabold tracking-tight text-primary tabular-nums">
          {countFormat.format(value)}
        </p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </CardContent>
      <Icon
        aria-hidden
        className="pointer-events-none absolute -right-3 -bottom-3 size-20 text-primary opacity-10"
      />
    </Card>
  );
}

export function StatsTotals({ tournaments, games }: { tournaments: number; games: number }) {
  return (
    <div className="grid h-full grid-cols-2 gap-4">
      <TotalCard
        value={tournaments}
        label={polishPlural(tournaments, {
          one: "Zakończony turniej",
          few: "Zakończone turnieje",
          many: "Zakończonych turniejów",
        })}
        icon={Trophy}
        className="to-gradient-2"
      />
      <TotalCard
        value={games}
        label={polishPlural(games, {
          one: "Rozegrana partia",
          few: "Rozegrane partie",
          many: "Rozegranych partii",
        })}
        icon={ChessPawn}
      />
    </div>
  );
}
