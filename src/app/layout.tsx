import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Napiwek",
  description: "Wyniki turniejów klubu szachowego Napiwek",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
