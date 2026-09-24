import { ChartColumn, Swords, Trophy, Users, type LucideIcon } from "lucide-react";

export const routes = {
  tournaments: "/turnieje",
  tournament: (slug: string) => `/turnieje/${slug}`,
  players: "/zawodnicy",
  player: (slug: string) => `/zawodnicy/${slug}`,
  stats: "/statystyki",
  headToHead: (...slugs: string[]) =>
    slugs.length === 0 ? "/head-to-head" : `/head-to-head/${slugs.join("/")}`,
} as const;

export const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Turnieje", href: routes.tournaments, icon: Trophy },
  { label: "Zawodnicy", href: routes.players, icon: Users },
  { label: "Statystyki", href: routes.stats, icon: ChartColumn },
  { label: "Bezpośrednio", href: routes.headToHead(), icon: Swords },
];
