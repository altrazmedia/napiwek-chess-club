import type { ReactNode } from "react";

export function PageShell({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
      {children}
    </main>
  );
}
