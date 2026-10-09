import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StatisticCard({
  title,
  description,
  ranking,
}: {
  title: string;
  description: string;
  ranking?: number;
}) {
  return (
    <Card className="relative h-full">
      {ranking !== undefined ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 right-2 text-9xl leading-none font-black text-muted-foreground opacity-10 select-none"
        >
          {ranking}
        </span>
      ) : null}
      <CardHeader className="relative pr-14">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
