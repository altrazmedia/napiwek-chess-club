export function PageShell({ title }: { title: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </main>
  );
}
