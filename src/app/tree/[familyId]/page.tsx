import { PublicFamilyTreeView } from "@/components/tree/PublicFamilyTreeView";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function PublicTreePage({ params }: PageProps) {
  const { familyId } = await params;
  const id = decodeURIComponent(familyId);
  return <PublicFamilyTreeView key={id} familyId={id} />;
}
