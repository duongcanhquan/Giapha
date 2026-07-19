import { StaffManager } from "@/components/dashboard/StaffManager";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function StaffPage({ params }: PageProps) {
  const { familyId } = await params;
  return <StaffManager familyId={decodeURIComponent(familyId)} />;
}
