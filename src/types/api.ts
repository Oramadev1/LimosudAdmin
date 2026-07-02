export interface Permission {
  id: number;
  name: string;
  slug: string;
  module?: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  roles: Role[];
  permissions: Permission[];
}

export interface LoginResponse {
  user: AdminUser;
}

export interface MeResponse {
  data: AdminUser;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  phone?: string | null;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export interface AdminRole {
  id: number;
  name: string;
  slug: string;
  permissions?: Permission[];
}

export interface AdminUserDetailResponse {
  data: AdminUser;
  role_permission_slugs: string[];
  direct_permission_slugs: string[];
  effective_permission_slugs: string[];
}

export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

export interface LookupRef {
  id: number;
  name: string;
  slug: string;
  image_path?: string | null;
}

export interface Paginated<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface VehicleBrand {
  id: number;
  name: string;
  slug: string;
  image_path: string | null;
  is_active: boolean;
}

export interface VehicleCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export interface Vehicle {
  id: number;
  name: string;
  slug: string;
  model: string;
  year: number;
  plate_number: string;
  mileage: number;
  current_mileage_updated_at: string | null;
  seats: number;
  doors: number;
  daily_price: string;
  deposit_amount: string;
  description: string | null;
  is_featured: boolean;
  is_active: boolean;
  brand: LookupRef;
  category: LookupRef;
  status: LookupRef;
  transmission_type: LookupRef;
  fuel_type: LookupRef;
  photos?: VehiclePhoto[];
  documents?: VehicleDocument[];
}

export interface VehiclePhoto {
  id: number;
  path: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface VehicleDocument {
  id: number;
  document_type: LookupRef;
  title: string;
  file_path: string;
  expires_at: string | null;
}

export interface CreateVehiclePayload {
  brand_id: number;
  category_id: number;
  status_slug: string;
  transmission_type_slug: string;
  fuel_type_slug: string;
  name: string;
  slug: string;
  model: string;
  year: number;
  plate_number: string;
  mileage: number;
  seats: number;
  doors: number;
  daily_price: number;
  deposit_amount: number;
  description?: string | null;
  current_mileage_updated_at?: string | null;
  is_featured?: boolean;
  is_active?: boolean;
}

export interface Location {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  delivery_fee: string;
  is_active: boolean;
  location_type: LookupRef;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  cover_image: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBlogPostPayload {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image?: string | null;
  is_published?: boolean;
  published_at?: string | null;
}

export interface CreateLocationPayload {
  location_type_slug: string;
  name: string;
  slug: string;
  address?: string | null;
  delivery_fee?: number;
  is_active?: boolean;
}

export interface Customer {
  id: number;
  full_name: string;
  nationality: string;
  phone: string;
  email: string | null;
  address?: string | null;
  foreign_address?: string | null;
  passport_or_cin: string | null;
  passport_or_cin_issued_at?: string | null;
  driving_license_number: string | null;
  driving_license_issued_at?: string | null;
  driving_license_expires_at?: string | null;
  driving_license_country?: string | null;
  reservations_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerStatistics {
  reservations_count: number;
  completed_count: number;
  cancelled_count: number;
  active_count: number;
  total_days: number;
  total_booked: string;
  total_paid: string;
  total_outstanding: string;
  average_booking_value: string;
  first_reservation_at: string | null;
  last_reservation_at: string | null;
  favorite_vehicle: {
    id: number;
    name: string;
    rentals_count: number;
  } | null;
}

export interface CustomerReservationSummary {
  id: number;
  reservation_number: string;
  status: LookupRef;
  payment_status: LookupRef;
  vehicle: { id: number; name: string; slug: string };
  start_datetime: string;
  end_datetime: string;
  total_days: number;
  total_price: string;
  created_at: string;
}

export interface CustomerDetailResponse {
  data: Customer;
  statistics: CustomerStatistics;
  recent_reservations: CustomerReservationSummary[];
}

export interface CreateCustomerPayload {
  full_name: string;
  nationality: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  foreign_address?: string | null;
  passport_or_cin?: string | null;
  passport_or_cin_issued_at?: string | null;
  driving_license_number?: string | null;
  driving_license_issued_at?: string | null;
  driving_license_expires_at?: string | null;
  driving_license_country?: string | null;
}

export interface Reservation {
  id: number;
  reservation_number: string;
  customer: Customer;
  vehicle: Vehicle;
  source: LookupRef;
  status: LookupRef;
  payment_status: LookupRef;
  pickup_location: Location | null;
  dropoff_location: Location | null;
  start_datetime: string;
  end_datetime: string;
  total_days: number;
  price_per_day: string;
  delivery_fee: string;
  deposit_amount: string;
  total_price: string;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationPayload {
  customer_id: number;
  vehicle_id: number;
  pickup_location_id: number;
  dropoff_location_id: number;
  start_datetime: string;
  end_datetime: string;
  customer_notes?: string | null;
  admin_notes?: string | null;
}

export interface BlockedReservationPeriod {
  start_datetime: string;
  end_datetime: string;
  status: string | null;
  reservation_number: string;
}

export interface SuggestedReservationPeriod {
  start_datetime: string;
  end_datetime: string;
}

export interface ReservationAvailabilityResult {
  available: boolean;
  vehicle_rentable: boolean;
  vehicle_status: string | null;
  blocked_periods: BlockedReservationPeriod[];
  conflicting_periods: BlockedReservationPeriod[];
  suggested_periods: SuggestedReservationPeriod[];
}

export interface VehicleAvailabilitySchedule {
  vehicle_id: number;
  vehicle_rentable: boolean;
  vehicle_status: string | null;
  blocked_periods: BlockedReservationPeriod[];
}

export interface AdminLookups {
  vehicle_statuses: LookupRef[];
  transmission_types: LookupRef[];
  fuel_types: LookupRef[];
  reservation_statuses: LookupRef[];
  payment_statuses: LookupRef[];
  payment_methods: LookupRef[];
  payment_types: LookupRef[];
  reservation_sources: LookupRef[];
  location_types: LookupRef[];
  maintenance_types: LookupRef[];
  expense_categories: LookupRef[];
  alert_types: LookupRef[];
  alert_statuses: LookupRef[];
  document_types: LookupRef[];
  contract_statuses: LookupRef[];
  vehicle_brands: VehicleBrand[];
  vehicle_categories: VehicleCategory[];
  locations: Location[];
}

export interface DashboardStatistics {
  global_kpis: {
    total_vehicles: number;
    available_vehicles: number;
    reserved_vehicles: number;
    rented_vehicles: number;
    confirmed_reservations: number;
    reservations_today: number;
    reservations_this_month: number;
    total_customers: number;
    monthly_revenue: number;
    monthly_expenses: number;
    monthly_net_profit: number;
  };
  month: { year: number; month: number };
}

export interface Alert {
  id: number;
  title: string;
  message: string | null;
  due_date: string | null;
  reservation_id: number | null;
  contact_message_id?: number | null;
  reservation?: {
    id: number;
    reservation_number: string;
  } | null;
  contact_message?: {
    id: number;
    name: string;
    email: string;
  } | null;
  alert_type: LookupRef;
  alert_status: LookupRef;
  vehicle?: {
    id: number;
    name: string;
    slug: string;
    plate_number: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  amount: string;
  payment_date: string;
  paid_by_customer_name: string | null;
  reference: string | null;
  notes: string | null;
  payment_method: LookupRef;
  payment_type: LookupRef;
  payment_status: LookupRef;
  reservation?: {
    id: number;
    reservation_number: string;
    total_price?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaymentSummary {
  reservation_id: number;
  reservation_number: string;
  total_price: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: LookupRef;
}

export interface CreatePaymentPayload {
  reservation_id: number;
  payment_method_slug: string;
  payment_type_slug: string;
  payment_status_slug: string;
  amount: number;
  payment_date: string;
  paid_by_customer_name?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface Maintenance {
  id: number;
  vehicle: {
    id: number;
    name: string;
    slug: string;
    plate_number: string;
  };
  maintenance_type: LookupRef;
  maintenance_date: string;
  next_maintenance_date: string | null;
  mileage: number | null;
  cost: string | null;
  garage_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenancePayload {
  vehicle_id: number;
  maintenance_type_slug: string;
  maintenance_date: string;
  next_maintenance_date?: string | null;
  mileage?: number | null;
  cost: number;
  garage_name?: string | null;
  notes?: string | null;
  vehicle_status_slug?: string | null;
  create_expense?: boolean;
  expense_category_slug?: string | null;
}

export interface Expense {
  id: number;
  vehicle: {
    id: number;
    name: string;
    slug: string;
    plate_number: string;
  } | null;
  expense_category: LookupRef;
  amount: string;
  expense_date: string;
  description: string | null;
  has_invoice: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExpensePayload {
  vehicle_id?: number | null;
  expense_category_slug: string;
  amount: number;
  expense_date: string;
  description?: string | null;
}

export interface Contract {
  id: number;
  reservation_id: number;
  contract_number: string;
  contract_series: string;
  status: LookupRef;
  has_pdf: boolean;
  has_signed_pdf: boolean;
  generated_at: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ContractInsuranceType = "basic" | "premium";

export interface ContractDetailsPayload {
  customer: {
    passport_or_cin: string | null;
    driving_license_number: string | null;
    address: string | null;
    foreign_address: string | null;
    license_issued_at: string | null;
    license_expires_at: string | null;
    license_country: string | null;
    passport_or_cin_issued_at: string | null;
  };
  vehicle: {
    vin: string | null;
    color: string | null;
    fuel_level: string | null;
    mileage: number | null;
  };
  additional_driver: {
    enabled: boolean;
    full_name: string;
    address: string;
    passport_or_cin: string;
    driving_license_number: string;
    license_issued_at: string;
    license_expires_at: string;
    nationality: string;
    phone: string;
  };
  equipment: Record<string, boolean>;
  documents: Record<string, boolean>;
  condition: {
    before: Record<string, string>;
    after: Record<string, string>;
  };
  rental: {
    actual_return_date: string;
    actual_return_time: string;
    extension: string;
    extension_total: string;
  };
  payment: {
    discount: number;
    additional_fees: number;
    late_return_fees: number;
    fuel_charges: number;
    cleaning_charges: number;
    damage_charges: number;
    tax: number;
    scheduled_payment_date: string;
    payment_method_slug: "cash" | "bank_transfer" | "credit_card";
  };
  insurance: {
    type: ContractInsuranceType;
    deductible: number;
  };
  special_authorization: {
    leave_urban_area: boolean;
  };
  persist_customer: boolean;
  persist_vehicle: boolean;
}

export interface ContractFormData {
  reservation_id: number;
  reservation_number: string;
  reservation_status: string;
  can_generate: boolean;
  existing_contract: {
    id: number;
    contract_number: string;
    contract_series: string;
    status: LookupRef;
  } | null;
  auto: {
    contract_series: string;
    generation_date: string;
    customer: {
      id: number;
      full_name: string;
      nationality: string;
      phone: string;
      email: string | null;
      passport_or_cin: string | null;
      driving_license_number: string | null;
    };
    vehicle: {
      brand: string | null;
      model: string | null;
      name: string;
      category: string | null;
      plate_number: string;
      year: number | null;
      transmission: string | null;
      fuel_type: string | null;
      daily_price: number;
    };
    rental: {
      pickup_location: string | null;
      dropoff_location: string | null;
      pickup_datetime: string;
      dropoff_datetime: string;
      total_days: number;
    };
    payment: {
      deposit_amount: number;
      delivery_fee: number;
      total_price: number;
      amount_paid: number;
      remaining_balance: number;
      payment_status: string | null;
      payment_method: string | null;
    };
  };
  details: ContractDetailsPayload;
  missing_fields: string[];
}

export interface GenerateContractPayload {
  contract_series?: string;
  details?: Partial<ContractDetailsPayload>;
}

export interface DashboardRevenueReport {
  daily_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  date_range_revenue: number;
  date_range: { start_date: string; end_date: string };
  group_by: string;
  grouped_revenue: Record<string, number>;
}

export interface DashboardExpenseReport {
  monthly_expenses: number;
  date_range_expenses: number;
  date_range: { start_date: string; end_date: string };
  group_by: string;
  grouped_expenses: Record<string, number>;
  expenses_by_category: Array<{ slug: string; name: string; total_amount: number; expense_count: number }>;
  expenses_by_vehicle: Array<{ id: number | null; name: string; plate_number: string | null; total_amount: number; expense_count: number }>;
}

export interface CustomerDocument {
  id: number;
  document_type: LookupRef;
  title: string;
  file_path: string;
  expires_at: string | null;
}

export interface CreateAlertPayload {
  vehicle_id?: number | null;
  alert_type_slug: string;
  alert_status_slug?: string;
  title: string;
  message?: string | null;
  due_date?: string | null;
}
