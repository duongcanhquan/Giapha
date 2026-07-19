import { AppearanceSettings } from "@/components/dashboard/AppearanceSettings";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function AppearancePage({ params }: PageProps) {
  const { familyId } = await params;
  return <AppearanceSettings familyId={decodeURIComponent(familyId)} />;
}
