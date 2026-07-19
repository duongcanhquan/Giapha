import { ManagersManager } from "@/components/dashboard/ManagersManager";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function ManagersPage({ params }: PageProps) {
  const { familyId } = await params;
  return <ManagersManager familyId={decodeURIComponent(familyId)} />;
}
