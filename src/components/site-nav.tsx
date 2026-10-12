"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/routes";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-50 hidden border-b bg-background md:block">
        <ul className="mx-auto flex h-14 max-w-5xl items-center justify-center gap-6 px-4">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 ${active ? "font-bold text-primary" : "font-normal text-foreground"}`}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 md:hidden">
        <ul className="flex items-center justify-between rounded-full bg-card/50 px-0.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)] ring-1 ring-black/10 backdrop-blur-xl backdrop-saturate-150">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-full py-0.5 text-[10px] leading-none tracking-tight whitespace-nowrap ${
                    active ? "font-bold text-primary" : "font-medium text-foreground"
                  }`}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
