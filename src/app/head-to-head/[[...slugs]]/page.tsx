import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";

export default async function HeadToHeadPage({ params }: PageProps<"/head-to-head/[[...slugs]]">) {
  const { slugs } = await params;
  const players = slugs ?? [];

  if (players.length > 2) {
    notFound();
  }

  const title = players.length === 0 ? "Bezpośrednio" : `Bezpośrednio: ${players.join(", ")}`;

  return <PageShell title={title} />;
}
