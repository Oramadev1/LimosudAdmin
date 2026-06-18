import { PageHeader } from "@/components/ui/AdminUi";
import { VehicleForm } from "@/components/vehicles/VehicleForm";

type EditVehiclePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params;

  return (
    <div>
      <PageHeader
        title="Edit vehicle"
        description="Two steps: vehicle details, then photos and settings."
      />
      <VehicleForm vehicleId={Number(id)} />
    </div>
  );
}
