import { Spinner } from "@/components/spinner";

export default function PlayerLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Spinner large />
    </main>
  );
}
