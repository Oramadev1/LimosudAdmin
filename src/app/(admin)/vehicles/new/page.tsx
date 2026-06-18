import { PageHeader } from "@/components/ui/AdminUi";
import { VehicleForm } from "@/components/vehicles/VehicleForm";

export default function NewVehiclePage() {
  return (
    <div>
      <PageHeader
        title="Add vehicle"
        description="Two steps: vehicle details, then photos and settings."
      />
      <VehicleForm />
    </div>
  );
}
