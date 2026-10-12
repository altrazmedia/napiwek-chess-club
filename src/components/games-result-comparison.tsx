import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWinRatePercent } from "@/lib/format-win-rate";
import { cn } from "cn";

export type GamesResultSegment = {
  label: string;
  value: number;
  colorClassName: string;
};

export function GamesResultComparison({
  title,
  segments,
  className,
}: {
  title: string;
  segments: GamesResultSegment[];
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <Card gradient className={className}>
      <CardHeader>
        <CardTitle className="text-xl tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="@container flex flex-col gap-4">
        <div
          aria-hidden
          className="flex h-3.5 gap-1 rounded-full border border-border bg-muted p-0.5"
        >
          {segments.map((segment, index) =>
            segment.value > 0 ? (
              <div
                key={`${segment.label}-${index}`}
                className={cn("h-full min-w-0 rounded-full", segment.colorClassName)}
                style={{ flexGrow: segment.value, flexBasis: 0 }}
              />
            ) : null,
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 @min-[22rem]:gap-2.5">
          {segments.map((segment, index) => (
            <div
              key={`${segment.label}-${index}`}
              className="min-w-0 rounded-xl border px-2 py-2.5 @min-[22rem]:p-3"
            >
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span
                  aria-hidden
                  className={cn("size-2.5 shrink-0 rounded-full", segment.colorClassName)}
                />
                <span className="text-xs leading-tight font-semibold @min-[22rem]:text-sm">
                  {segment.label}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0 @min-[22rem]:mt-2 @min-[22rem]:gap-x-2">
                <span className="text-xl font-extrabold tabular-nums">{segment.value}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  ({formatWinRatePercent(segment.value, total)})
                </span>
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
