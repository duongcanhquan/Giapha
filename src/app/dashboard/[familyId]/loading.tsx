import { DashboardPanelSkeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#e9eef3] p-4 md:p-6">
      <DashboardPanelSkeleton />
    </main>
  );
}
