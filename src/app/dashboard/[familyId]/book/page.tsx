import { GenealogyBook } from "@/components/dashboard/GenealogyBook";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function GenealogyBookPage({ params }: PageProps) {
  const { familyId } = await params;
  return <GenealogyBook familyId={decodeURIComponent(familyId)} />;
}
