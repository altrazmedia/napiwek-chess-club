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
        <ul className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 ${active ? "font-bold" : "font-normal"}`}
                >
                  <Icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/80 backdrop-blur-md md:hidden">
        <ul className="flex pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 px-1 py-2 text-xs ${active ? "font-bold" : "font-normal"}`}
                >
                  <Icon className="size-5" aria-hidden />
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
