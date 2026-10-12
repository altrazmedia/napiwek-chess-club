import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

export function SectionHeader({
  title,
  icon: Icon,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <h2 className={cn("flex items-center gap-2 text-2xl leading-8 font-bold", className)}>
      {Icon ? <Icon aria-hidden className="size-5 shrink-0 text-primary" /> : null}
      {title}
    </h2>
  );
}
