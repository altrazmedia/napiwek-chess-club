import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Napiwek",
  description: "Wyniki turniejów klubu szachowego Napiwek",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <div className="flex min-h-full flex-1 flex-col pb-[calc(3rem+max(0.5rem,env(safe-area-inset-bottom)))] md:pt-14 md:pb-0">
          {children}
        </div>
      </body>
    </html>
  );
}
