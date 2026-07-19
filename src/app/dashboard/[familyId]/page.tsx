import { FamilyAdminWorkspace } from "@/components/dashboard/FamilyAdminWorkspace";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function DashboardHomePage({ params }: PageProps) {
  const { familyId: raw } = await params;
  const familyId = decodeURIComponent(raw);

  return <FamilyAdminWorkspace familyId={familyId} />;
}
