import { withAuth, withAuthBlob, withAuthForm } from "@/lib/api/authenticated";
import type {
  AdminLookups,
  Alert,
  ContactMessage,
  Contract,
  ContractFormData,
  GenerateContractPayload,
  CreateAlertPayload,
  CreateCustomerPayload,
  CreateExpensePayload,
  CreateLocationPayload,
  CreateMaintenancePayload,
  CreatePaymentPayload,
  CreateReservationPayload,
  CreateVehiclePayload,
  Customer,
  CustomerDetailResponse,
  AdminRole,
  AdminUser,
  AdminUserDetailResponse,
  DashboardExpenseReport,
  DashboardRevenueReport,
  DashboardStatistics,
  Expense,
  Maintenance,
  Paginated,
  Payment,
  Permission,
  PaymentSummary,
  Reservation,
  ReservationAvailabilityResult,
  VehicleAvailabilitySchedule,
  Vehicle,
  VehicleBrand,
  VehicleCategory,
} from "@/types/api";

const json = (payload: unknown) => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

export function getLookups() {
  return withAuth<AdminLookups>("/admin/lookups");
}

export function getDashboardStatistics(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const query = params.toString();
  return withAuth<DashboardStatistics>(`/admin/dashboard/statistics${query ? `?${query}` : ""}`);
}

export function getDashboardRevenue(startDate?: string, endDate?: string, groupBy = "day") {
  const params = new URLSearchParams({ group_by: groupBy });
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return withAuth<DashboardRevenueReport>(`/admin/dashboard/revenue?${params}`);
}

export function getDashboardExpensesReport(startDate?: string, endDate?: string, groupBy = "day") {
  const params = new URLSearchParams({ group_by: groupBy });
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return withAuth<DashboardExpenseReport>(`/admin/dashboard/expenses?${params}`);
}

export function getVehicles(page = 1) {
  return withAuth<Paginated<Vehicle>>(`/admin/vehicles?page=${page}`);
}

export function getVehicle(id: number) {
  return withAuth<{ data: Vehicle }>(`/admin/vehicles/${id}`);
}

export function createVehicle(payload: CreateVehiclePayload) {
  return withAuth<{ data: Vehicle }>("/admin/vehicles", { method: "POST", ...json(payload) });
}

export function updateVehicle(id: number, payload: Partial<CreateVehiclePayload>) {
  return withAuth<{ data: Vehicle }>(`/admin/vehicles/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteVehicle(id: number) {
  return withAuth<null>(`/admin/vehicles/${id}`, { method: "DELETE" });
}

export function getVehicleMaintenances(vehicleId: number, page = 1) {
  return withAuth<Paginated<Maintenance>>(`/admin/vehicles/${vehicleId}/maintenances?page=${page}`);
}

export function getVehicleExpenses(vehicleId: number, page = 1) {
  return withAuth<Paginated<Expense>>(`/admin/vehicles/${vehicleId}/expenses?page=${page}`);
}

export function getVehicleBrands(page = 1) {
  return withAuth<Paginated<VehicleBrand>>(`/admin/vehicle-brands?page=${page}`);
}

export function getVehicleBrand(id: number) {
  return withAuth<{ data: VehicleBrand }>(`/admin/vehicle-brands/${id}`);
}

export function createVehicleBrand(payload: { name: string; slug: string; is_active?: boolean }) {
  return withAuth<{ data: VehicleBrand }>("/admin/vehicle-brands", { method: "POST", ...json(payload) });
}

export function updateVehicleBrand(id: number, payload: Partial<{ name: string; slug: string; is_active: boolean }>) {
  return withAuth<{ data: VehicleBrand }>(`/admin/vehicle-brands/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteVehicleBrand(id: number) {
  return withAuth<null>(`/admin/vehicle-brands/${id}`, { method: "DELETE" });
}

export function uploadVehicleBrandImage(id: number, image: File) {
  const formData = new FormData();
  formData.append("image", image);
  return withAuthForm<{ data: VehicleBrand }>(`/admin/vehicle-brands/${id}/image`, formData);
}

export function deleteVehicleBrandImage(id: number) {
  return withAuth<{ data: VehicleBrand }>(`/admin/vehicle-brands/${id}/image`, { method: "DELETE" });
}

export function uploadVehiclePhotos(
  vehicleId: number,
  files: File[],
  options?: { alt_text?: string; is_primary?: boolean },
) {
  const formData = new FormData();
  files.forEach((file, index) => formData.append(`photos[${index}]`, file));
  if (options?.alt_text) formData.append("alt_text", options.alt_text);
  if (options?.is_primary !== undefined) {
    formData.append("is_primary", options.is_primary ? "1" : "0");
  }
  return withAuthForm<{ data: import("@/types/api").VehiclePhoto[] }>(
    `/admin/vehicles/${vehicleId}/photos`,
    formData,
  );
}

export function updateVehiclePhoto(
  photoId: number,
  payload: { alt_text?: string | null; sort_order?: number; is_primary?: boolean },
) {
  return withAuth<{ data: import("@/types/api").VehiclePhoto }>(`/admin/vehicle-photos/${photoId}`, {
    method: "PATCH",
    ...json(payload),
  });
}

export function deleteVehiclePhoto(photoId: number) {
  return withAuth<null>(`/admin/vehicle-photos/${photoId}`, { method: "DELETE" });
}

export function getVehicleCategories(page = 1) {
  return withAuth<Paginated<VehicleCategory>>(`/admin/vehicle-categories?page=${page}`);
}

export function getVehicleCategory(id: number) {
  return withAuth<{ data: VehicleCategory }>(`/admin/vehicle-categories/${id}`);
}

export function createVehicleCategory(payload: {
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
}) {
  return withAuth<{ data: VehicleCategory }>("/admin/vehicle-categories", { method: "POST", ...json(payload) });
}

export function updateVehicleCategory(
  id: number,
  payload: Partial<{ name: string; slug: string; description: string | null; is_active: boolean }>,
) {
  return withAuth<{ data: VehicleCategory }>(`/admin/vehicle-categories/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteVehicleCategory(id: number) {
  return withAuth<null>(`/admin/vehicle-categories/${id}`, { method: "DELETE" });
}

export function getLocations(page = 1) {
  return withAuth<Paginated<import("@/types/api").Location>>(`/admin/locations?page=${page}`);
}

export function getLocation(id: number) {
  return withAuth<{ data: import("@/types/api").Location }>(`/admin/locations/${id}`);
}

export function createLocation(payload: CreateLocationPayload) {
  return withAuth<{ data: import("@/types/api").Location }>("/admin/locations", { method: "POST", ...json(payload) });
}

export function updateLocation(id: number, payload: Partial<CreateLocationPayload>) {
  return withAuth<{ data: import("@/types/api").Location }>(`/admin/locations/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteLocation(id: number) {
  return withAuth<null>(`/admin/locations/${id}`, { method: "DELETE" });
}

export function getBlogPosts(page = 1) {
  return withAuth<Paginated<import("@/types/api").BlogPost>>(`/admin/blog-posts?page=${page}`);
}

export function getBlogPost(id: number) {
  return withAuth<{ data: import("@/types/api").BlogPost }>(`/admin/blog-posts/${id}`);
}

export function createBlogPost(payload: import("@/types/api").CreateBlogPostPayload) {
  return withAuth<{ data: import("@/types/api").BlogPost }>("/admin/blog-posts", {
    method: "POST",
    ...json(payload),
  });
}

export function updateBlogPost(
  id: number,
  payload: Partial<import("@/types/api").CreateBlogPostPayload>,
) {
  return withAuth<{ data: import("@/types/api").BlogPost }>(`/admin/blog-posts/${id}`, {
    method: "PATCH",
    ...json(payload),
  });
}

export function deleteBlogPost(id: number) {
  return withAuth<null>(`/admin/blog-posts/${id}`, { method: "DELETE" });
}

export function getCustomers(page = 1) {
  return withAuth<Paginated<Customer>>(`/admin/customers?page=${page}`);
}

export function getCustomer(id: number) {
  return withAuth<CustomerDetailResponse>(`/admin/customers/${id}`);
}

export function createCustomer(payload: CreateCustomerPayload) {
  return withAuth<{ data: Customer }>("/admin/customers", { method: "POST", ...json(payload) });
}

export function updateCustomer(id: number, payload: Partial<CreateCustomerPayload>) {
  return withAuth<{ data: Customer }>(`/admin/customers/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteCustomer(id: number) {
  return withAuth<null>(`/admin/customers/${id}`, { method: "DELETE" });
}

export function uploadCustomerDocument(
  customerId: number,
  formData: FormData,
) {
  return withAuthForm<{ data: import("@/types/api").CustomerDocument }>(
    `/admin/customers/${customerId}/documents`,
    formData,
  );
}

export function deleteCustomerDocument(documentId: number) {
  return withAuth<null>(`/admin/customer-documents/${documentId}`, { method: "DELETE" });
}

export function getReservations(page = 1, perPage = 15) {
  return withAuth<Paginated<Reservation>>(`/admin/reservations?page=${page}&per_page=${perPage}`);
}

export function getReservationCalendar(start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const query = params.toString();
  return withAuth<{ data: Reservation[] }>(`/admin/reservations-calendar${query ? `?${query}` : ""}`);
}

export function getReservation(id: number) {
  return withAuth<{ data: Reservation }>(`/admin/reservations/${id}`);
}

export function createReservation(payload: CreateReservationPayload) {
  return withAuth<{ data: Reservation }>("/admin/reservations", { method: "POST", ...json(payload) });
}

export function updateReservation(id: number, payload: Partial<CreateReservationPayload>) {
  return withAuth<{ data: Reservation }>(`/admin/reservations/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteReservation(id: number) {
  return withAuth<null>(`/admin/reservations/${id}`, { method: "DELETE" });
}

export function checkReservationAvailability(payload: {
  vehicle_id: number;
  start_datetime: string;
  end_datetime: string;
  ignore_reservation_id?: number | null;
}) {
  return withAuth<ReservationAvailabilityResult>("/admin/reservations/check-availability", {
    method: "POST",
    ...json(payload),
  });
}

export function getVehicleAvailabilitySchedule(vehicleId: number, ignoreReservationId?: number | null) {
  const params = new URLSearchParams({ vehicle_id: String(vehicleId) });
  if (ignoreReservationId) {
    params.set("ignore_reservation_id", String(ignoreReservationId));
  }

  return withAuth<VehicleAvailabilitySchedule>(`/admin/reservations/vehicle-availability?${params.toString()}`);
}

export function reservationAction(
  id: number,
  action: "confirm" | "start" | "complete" | "cancel" | "reject" | "reopen",
) {
  return withAuth<{ data: Reservation }>(`/admin/reservations/${id}/${action}`, { method: "POST" });
}

export function getPayments(page = 1) {
  return withAuth<Paginated<Payment>>(`/admin/payments?page=${page}`);
}

export function getPayment(id: number) {
  return withAuth<{ data: Payment }>(`/admin/payments/${id}`);
}

export function createPayment(payload: CreatePaymentPayload) {
  return withAuth<{ data: Payment }>("/admin/payments", { method: "POST", ...json(payload) });
}

export function updatePayment(id: number, payload: Partial<CreatePaymentPayload>) {
  return withAuth<{ data: Payment }>(`/admin/payments/${id}`, { method: "PATCH", ...json(payload) });
}

export function cancelPayment(id: number) {
  return withAuth<{ data: Payment }>(`/admin/payments/${id}/cancel`, { method: "POST" });
}

export function getPaymentSummary(reservationId: number) {
  return withAuth<PaymentSummary>(`/admin/reservations/${reservationId}/payment-summary`);
}

export function getContractForm(reservationId: number) {
  return withAuth<{ data: ContractFormData }>(`/admin/reservations/${reservationId}/contract/form`);
}

export function getContractByReservation(reservationId: number) {
  return withAuth<{ data: Contract }>(`/admin/reservations/${reservationId}/contract`);
}

export function generateContract(reservationId: number, payload?: GenerateContractPayload) {
  return withAuth<{ data: Contract }>(`/admin/reservations/${reservationId}/contract/generate`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export function downloadContract(contractId: number) {
  return withAuthBlob(`/admin/contracts/${contractId}/download`);
}

export function markContractSigned(contractId: number, signedPdf?: File) {
  const formData = new FormData();
  if (signedPdf) formData.append("signed_pdf", signedPdf);
  return withAuthForm<{ data: Contract }>(`/admin/contracts/${contractId}/signed`, formData, {
    method: "POST",
  });
}

export function cancelContract(contractId: number) {
  return withAuth<{ data: Contract }>(`/admin/contracts/${contractId}/cancel`, { method: "POST" });
}

export function getMaintenances(page = 1) {
  return withAuth<Paginated<Maintenance>>(`/admin/maintenances?page=${page}`);
}

export function getUpcomingMaintenances(page = 1) {
  return withAuth<Paginated<Maintenance>>(`/admin/maintenances/upcoming?page=${page}`);
}

export function getMaintenance(id: number) {
  return withAuth<{ data: Maintenance }>(`/admin/maintenances/${id}`);
}

export function createMaintenance(payload: CreateMaintenancePayload) {
  return withAuth<{ data: Maintenance }>("/admin/maintenances", { method: "POST", ...json(payload) });
}

export function updateMaintenance(id: number, payload: Partial<CreateMaintenancePayload>) {
  return withAuth<{ data: Maintenance }>(`/admin/maintenances/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteMaintenance(id: number) {
  return withAuth<null>(`/admin/maintenances/${id}`, { method: "DELETE" });
}

export function getExpenses(page = 1) {
  return withAuth<Paginated<Expense>>(`/admin/expenses?page=${page}`);
}

export function getExpense(id: number) {
  return withAuth<{ data: Expense }>(`/admin/expenses/${id}`);
}

export function createExpense(payload: CreateExpensePayload, invoice?: File) {
  if (invoice) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    formData.append("invoice", invoice);
    return withAuthForm<{ data: Expense }>("/admin/expenses", formData);
  }
  return withAuth<{ data: Expense }>("/admin/expenses", { method: "POST", ...json(payload) });
}

export function updateExpense(id: number, payload: Partial<CreateExpensePayload>, invoice?: File) {
  if (invoice) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    formData.append("invoice", invoice);
    return withAuthForm<{ data: Expense }>(`/admin/expenses/${id}`, formData, { method: "PATCH" });
  }
  return withAuth<{ data: Expense }>(`/admin/expenses/${id}`, { method: "PATCH", ...json(payload) });
}

export function deleteExpense(id: number) {
  return withAuth<null>(`/admin/expenses/${id}`, { method: "DELETE" });
}

export function getExpenseMonthlySummary(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const query = params.toString();
  return withAuth<{
    year: number;
    month: number;
    total_amount: number;
    expense_count: number;
    by_category: Array<{ slug: string; name: string; total: number }>;
  }>(`/admin/expenses/monthly-summary${query ? `?${query}` : ""}`);
}

export function getAlerts(page = 1) {
  return withAuth<Paginated<Alert>>(`/admin/alerts?page=${page}`);
}

export function getPendingAlerts(page = 1) {
  return withAuth<Paginated<Alert>>(`/admin/alerts/pending?page=${page}`);
}

export function getAlert(id: number) {
  return withAuth<{ data: Alert }>(`/admin/alerts/${id}`);
}

export function createAlert(payload: CreateAlertPayload) {
  return withAuth<{ data: Alert }>("/admin/alerts", { method: "POST", ...json(payload) });
}

export function generateAlerts() {
  return withAuth<{
    maintenance_alerts_created: number;
    document_expiry_alerts_created: number;
    total_created: number;
  }>("/admin/alerts/generate", { method: "POST" });
}

export function alertAction(id: number, action: "done" | "ignore") {
  return withAuth<{ data: Alert }>(`/admin/alerts/${id}/${action}`, { method: "PATCH" });
}

export function getContactMessages(page = 1) {
  return withAuth<Paginated<ContactMessage>>(`/admin/contact-messages?page=${page}`);
}

export function getContactMessage(id: number) {
  return withAuth<{ data: ContactMessage }>(`/admin/contact-messages/${id}`);
}

export function markContactMessageRead(id: number) {
  return withAuth<{ data: ContactMessage }>(`/admin/contact-messages/${id}/read`, {
    method: "PATCH",
  });
}

export function deleteContactMessage(id: number) {
  return withAuth<void>(`/admin/contact-messages/${id}`, { method: "DELETE" });
}

export function getUsers(page = 1) {
  return withAuth<Paginated<AdminUser>>(`/admin/users?page=${page}`);
}

export function getUser(id: number) {
  return withAuth<AdminUserDetailResponse>(`/admin/users/${id}`);
}

export function updateUser(
  id: number,
  payload: {
    name?: string;
    email?: string;
    phone?: string | null;
    is_active?: boolean;
    role_ids?: number[];
  },
) {
  return withAuth<{ data: AdminUser }>(`/admin/users/${id}`, { method: "PATCH", ...json(payload) });
}

export function syncUserPermissions(
  id: number,
  payload: { permission_ids: number[]; role_ids?: number[] },
) {
  return withAuth<AdminUserDetailResponse>(`/admin/users/${id}/permissions`, {
    method: "PATCH",
    ...json(payload),
  });
}

export function getRoles() {
  return withAuth<{ data: AdminRole[] }>("/admin/roles");
}

export function getPermissions() {
  return withAuth<{ data: Permission[] }>("/admin/permissions");
}

export function syncRolePermissions(roleId: number, permissionIds: number[]) {
  return withAuth<{ data: AdminRole }>(`/admin/roles/${roleId}/permissions`, {
    method: "PATCH",
    ...json({ permission_ids: permissionIds }),
  });
}
