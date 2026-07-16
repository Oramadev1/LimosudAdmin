import { VehicleCalendarClient } from "@/components/vehicles/VehicleCalendarClient";

type VehicleCalendarPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VehicleCalendarPage({ params }: VehicleCalendarPageProps) {
  const { id } = await params;

  return (
    <div className="lg:flex lg:h-[calc(100dvh-3rem)] lg:flex-col lg:overflow-hidden">
      <VehicleCalendarClient vehicleId={Number(id)} />
    </div>
  );
}
