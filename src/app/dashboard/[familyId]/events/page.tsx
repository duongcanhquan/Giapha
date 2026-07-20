import { EventsManager } from "@/components/dashboard/EventsManager";

type PageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function EventsPage({ params }: PageProps) {
  const { familyId } = await params;
  return <EventsManager familyId={decodeURIComponent(familyId)} />;
}
