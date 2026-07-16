import { formatDateTime } from "@/lib/format";
import type { BlockedReservationPeriod, ReservationAvailabilityResult } from "@/types/api";

type AvailabilityFeedbackProps = {
  checking: boolean;
  hasValidDates: boolean;
  result: ReservationAvailabilityResult | null;
};

function conflictLabel(period: BlockedReservationPeriod): string {
  if (period.type === "hold") {
    return period.customer_name ? `Phone hold — ${period.customer_name}` : "Phone hold";
  }

  if (period.reservation_number) {
    return period.customer_name
      ? `Reservation ${period.reservation_number} — ${period.customer_name}`
      : `Reservation ${period.reservation_number}`;
  }

  return period.customer_name ? `Booking — ${period.customer_name}` : "Booking";
}

export function AvailabilityFeedback({ checking, hasValidDates, result }: AvailabilityFeedbackProps) {
  if (!hasValidDates) {
    return null;
  }

  if (!checking && !result) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      {checking ? (
        <span className="text-gray-500">Checking availability…</span>
      ) : result?.available ? (
        <span className="font-medium text-green-700">These dates are available.</span>
      ) : result ? (
        <div className="space-y-2">
          <p className="font-medium text-red-700">
            These dates overlap another booking. Choose different dates.
          </p>
          {result.conflicting_periods.length > 0 ? (
            <ul className="space-y-1 text-xs text-gray-600">
              {result.conflicting_periods.map((period) => (
                <li key={`${period.type ?? "reservation"}-${period.reservation_id ?? period.hold_id}-${period.start_datetime}`}>
                  <span className="font-medium text-gray-800">{conflictLabel(period)}</span>
                  {" · "}
                  {formatDateTime(period.start_datetime)} → {formatDateTime(period.end_datetime)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-600">Another reservation or phone hold blocks this period.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
