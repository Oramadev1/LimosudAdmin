export function getReservationStatusBadgeClass(slug: string): string {
  switch (slug) {
    case "pending":
      return "admin-badge admin-badge-pending";
    case "confirmed":
      return "admin-badge admin-badge-confirmed";
    case "in_progress":
      return "admin-badge admin-badge-in-progress";
    case "completed":
      return "admin-badge admin-badge-completed";
    case "cancelled":
    case "rejected":
      return "admin-badge admin-badge-cancelled";
    default:
      return "admin-badge admin-badge-unpaid";
  }
}

export function getPaymentStatusBadgeClass(slug: string): string {
  switch (slug) {
    case "paid":
      return "admin-badge admin-badge-paid";
    case "partial_paid":
      return "admin-badge admin-badge-partial";
    default:
      return "admin-badge admin-badge-unpaid";
  }
}
