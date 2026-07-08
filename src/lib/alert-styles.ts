export function getAlertTypeBadgeClass(slug: string): string {
  switch (slug) {
    case "reservation_follow_up":
      return "admin-badge admin-badge-confirmed";
    case "website_contact":
      return "admin-badge admin-badge-in-progress";
    case "maintenance_due":
      return "admin-badge admin-badge-partial";
    case "document_expiry":
    case "insurance_expiry":
      return "admin-badge admin-badge-cancelled";
    case "payment_due":
      return "admin-badge admin-badge-unpaid";
    case "vehicle_status":
      return "admin-badge admin-badge-in-progress";
    default:
      return "admin-badge admin-badge-unpaid";
  }
}

export function getAlertStatusBadgeClass(slug: string): string {
  switch (slug) {
    case "pending":
      return "admin-badge admin-badge-pending";
    case "done":
      return "admin-badge admin-badge-completed";
    case "ignored":
      return "admin-badge admin-badge-unpaid";
    case "seen":
      return "admin-badge admin-badge-confirmed";
    default:
      return "admin-badge admin-badge-unpaid";
  }
}

export function getAlertReservationId(alert: {
  reservation_id?: number | null;
  reservation?: { id: number } | null;
}): number | null {
  return alert.reservation_id ?? alert.reservation?.id ?? null;
}
