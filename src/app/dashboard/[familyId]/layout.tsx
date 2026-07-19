import { DashboardShell } from "@/components/dashboard/DashboardShell";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ familyId: string }>;
};

export default async function DashboardLayout({ children, params }: LayoutProps) {
  const { familyId } = await params;
  return (
    <DashboardShell familyId={decodeURIComponent(familyId)}>
      {children}
    </DashboardShell>
  );
}
