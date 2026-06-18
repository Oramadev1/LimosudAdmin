import { ReservationDetailClient } from "@/components/reservations/ReservationDetailClient";

type ReservationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const { id } = await params;
  return <ReservationDetailClient id={Number(id)} />;
}
