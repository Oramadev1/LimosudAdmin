export type ReservationAction = "confirm" | "start" | "complete" | "cancel" | "reject" | "reopen";

const ACTION_LABELS: Record<ReservationAction, string> = {
  confirm: "Confirm",
  start: "Start rental",
  complete: "Complete",
  cancel: "Cancel",
  reject: "Reject",
  reopen: "Reopen as pending",
};

export function getAllowedReservationActions(statusSlug: string): ReservationAction[] {
  switch (statusSlug) {
    case "pending":
      return ["confirm", "cancel", "reject"];
    case "confirmed":
      return ["start", "cancel"];
    case "in_progress":
      return ["complete", "cancel"];
    case "cancelled":
    case "rejected":
      return ["reopen"];
    default:
      return [];
  }
}

export function getReservationActionLabel(action: ReservationAction): string {
  return ACTION_LABELS[action];
}

export function getReservationActionButtonClass(action: ReservationAction): string {
  switch (action) {
    case "confirm":
    case "start":
    case "reopen":
      return "admin-btn-primary";
    case "complete":
      return "admin-btn-success";
    case "cancel":
    case "reject":
      return "admin-btn-danger";
    default:
      return "admin-btn-secondary";
  }
}

export function canRecordPayment(statusSlug: string): boolean {
  return ["pending", "confirmed", "in_progress", "completed"].includes(statusSlug);
}

export function isTerminalReservationStatus(statusSlug: string): boolean {
  return ["completed", "cancelled", "rejected"].includes(statusSlug);
}

export function getReservationStatusHint(statusSlug: string): string | null {
  switch (statusSlug) {
    case "pending":
      return "Confirm the reservation before starting the rental.";
    case "confirmed":
      return "Start the rental when the customer picks up the vehicle.";
    case "in_progress":
      return "Complete the rental when the vehicle is returned.";
    case "cancelled":
      return "This reservation is cancelled. Reopen it as pending if that was a mistake, then confirm again.";
    case "rejected":
      return "This reservation was rejected. Reopen it as pending if you want to accept the booking.";
    case "completed":
      return "This rental is completed.";
    default:
      return null;
  }
}
