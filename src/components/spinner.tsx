import { Loader2 } from "lucide-react";

export function Spinner({ large = false }: { large?: boolean }) {
  return (
    <p className={large ? "flex items-center gap-2" : "mt-8 flex items-center gap-2"}>
      <Loader2 className={large ? "size-6 animate-spin" : "size-4 animate-spin"} aria-hidden />
      Wczytywanie
    </p>
  );
}
