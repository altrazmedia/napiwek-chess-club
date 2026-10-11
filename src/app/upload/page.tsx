import { PageShell } from "@/components/page-shell";
import { listPlayerOptions } from "@/lib/db/queries/head-to-head";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const players = await loadPlayers();

  if (players === null) {
    return (
      <PageShell title="Wgraj turniej">
        <p className="mt-6">Nie udało się wczytać zawodników.</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Wgraj turniej">
      <UploadForm players={players} />
    </PageShell>
  );
}

async function loadPlayers() {
  try {
    return await listPlayerOptions();
  } catch (error) {
    console.error(error);
    return null;
  }
}
