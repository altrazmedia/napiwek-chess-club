import { PageShell } from "@/components/page-shell";

export default async function PlayerPage({ params }: PageProps<"/zawodnicy/[slug]">) {
  const { slug } = await params;

  return <PageShell title={slug} />;
}
