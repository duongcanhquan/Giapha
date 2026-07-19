import { MembersManager } from "@/components/dashboard/MembersManager";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function MembersPage({ params }: PageProps) {
  const { familyId } = await params;
  return <MembersManager familyId={decodeURIComponent(familyId)} />;
}
