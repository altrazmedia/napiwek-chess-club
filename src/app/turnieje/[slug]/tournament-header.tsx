import { CalendarDays } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { formatHeldOn } from "@/lib/format-held-on";

export function TournamentHeader({ name, heldOn }: { name: string; heldOn: string }) {
  return (
    <Card className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full bg-linear-to-br from-gradient-2/30 to-gradient-3/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -left-12 size-64 rounded-full bg-gradient-4/40 blur-xl"
      />
      <CardHeader className="relative max-w-3xl gap-3.5 p-5">
        <h1 className="text-4xl leading-12 font-extrabold tracking-tight text-card-foreground">
          {name}
        </h1>
        <p className="flex items-center gap-1.5 text-sm leading-relaxed text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-3.5 text-primary" />
          {formatHeldOn(heldOn)}
        </p>
      </CardHeader>
    </Card>
  );
}
