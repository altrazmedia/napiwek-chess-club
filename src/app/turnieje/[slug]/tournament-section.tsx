import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent } from "@/components/ui/card";

export function TournamentSection({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionHeader title={title} icon={icon} className="mb-4" />
      <Card>
        <CardContent>{children}</CardContent>
      </Card>
    </section>
  );
}
