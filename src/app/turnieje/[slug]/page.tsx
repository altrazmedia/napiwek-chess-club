import { PageShell } from "@/components/page-shell";

export default async function TournamentPage({ params }: PageProps<"/turnieje/[slug]">) {
  const { slug } = await params;

  return <PageShell title={slug} />;
}
