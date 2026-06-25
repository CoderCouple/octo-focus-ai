import { notFound } from "next/navigation";
import { MeetingDetail } from "@/features/meetings";
import { getMeetingApi } from "@/features/meetings/api/meetings-api";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: PageProps) {
  const { id } = await params;
  let meeting;
  try {
    meeting = await getMeetingApi(id);
  } catch {
    notFound();
  }

  return <MeetingDetail meeting={meeting} />;
}
