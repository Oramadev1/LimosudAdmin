import { AdminFormField } from "@/components/ui/AdminUi";
import { AvailabilityFeedback } from "@/components/reservations/AvailabilityFeedback";
import type { ReservationAvailabilityResult } from "@/types/api";

type RentalDatetimeFieldsProps = {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  checking?: boolean;
  availability?: ReservationAvailabilityResult | null;
  disabled?: boolean;
  startLabel?: string;
  endLabel?: string;
};

export function RentalDatetimeFields({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  checking = false,
  availability = null,
  disabled = false,
  startLabel = "Starts at",
  endLabel = "Ends at",
}: RentalDatetimeFieldsProps) {
  const hasValidDates =
    Boolean(startValue && endValue) && new Date(endValue) > new Date(startValue);

  return (
    <div className="space-y-4">
      <AdminFormField label={startLabel}>
        <input
          type="datetime-local"
          value={startValue}
          onChange={(event) => onStartChange(event.target.value)}
          className="admin-input"
          required
          disabled={disabled}
        />
      </AdminFormField>

      <AdminFormField label={endLabel}>
        <input
          type="datetime-local"
          value={endValue}
          onChange={(event) => onEndChange(event.target.value)}
          className="admin-input"
          required
          disabled={disabled}
        />
      </AdminFormField>

      <AvailabilityFeedback
        checking={checking}
        hasValidDates={hasValidDates}
        result={availability}
      />
    </div>
  );
}

export function hasValidRentalDatetimeRange(startValue: string, endValue: string): boolean {
  return Boolean(startValue && endValue) && new Date(endValue) > new Date(startValue);
}
