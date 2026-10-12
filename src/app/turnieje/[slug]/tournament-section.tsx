import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TournamentSection({
  header,
  children,
  className,
}: {
  header: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="mb-4 flex items-center gap-2 text-2xl leading-8 font-bold">{header}</h2>
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
