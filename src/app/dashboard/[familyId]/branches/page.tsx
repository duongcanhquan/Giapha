import { BranchesManager } from "@/components/dashboard/BranchesManager";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function BranchesPage({ params }: PageProps) {
  const { familyId } = await params;
  return <BranchesManager familyId={decodeURIComponent(familyId)} />;
}
