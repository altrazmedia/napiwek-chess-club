import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Napiwek",
  description: "Wyniki turniejów klubu szachowego Napiwek",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <div className="flex min-h-full flex-1 flex-col pb-[calc(3rem+max(0.5rem,env(safe-area-inset-bottom)))] md:pt-14 md:pb-0">
          {children}
        </div>
      </body>
    </html>
  );
}
