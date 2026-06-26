"use client";

import Link from "next/link";

import { getCustomer } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getPaymentStatusBadgeClass,
  getReservationStatusBadgeClass,
} from "@/lib/reservation-status";
import { useAdminQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { CustomerDetailResponse } from "@/types/api";
import { DetailRow, ErrorMessage, SectionCard, StatCard } from "@/components/ui/AdminUi";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CustomerDetailClient({ id }: { id: number }) {
  const { data, isPending, error } = useAdminQuery<CustomerDetailResponse>({
    queryKey: queryKeys.customer(id),
    queryFn: () => getCustomer(id),
  });

  if (isPending) {
    return <div className="admin-card p-6 text-sm text-gray-500">Loading customer...</div>;
  }

  if (error || !data) {
    const message =
      error instanceof ApiError ? error.message : error ? "Failed to load customer." : "Customer not found.";
    return <ErrorMessage message={message} />;
  }

  const customer = data.data;
  const stats = data.statistics;
  const reservations = data.recent_reservations;

  return (
    <div>
      <Link href="/customers" className="admin-btn-secondary admin-btn-sm mb-4">
        ← Back to customers
      </Link>

      <div className="admin-card mb-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="admin-section-title">Customer</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{customer.full_name}</h1>
          </div>
          <Link href={`/customers/${customer.id}/edit?returnTo=/customers/${customer.id}`} className="admin-btn-secondary admin-btn-sm">
            Edit customer
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label="Phone" value={customer.phone} />
          <DetailRow label="Email" value={customer.email ?? "—"} />
          <DetailRow label="Nationality" value={customer.nationality} />
          <DetailRow label="Passport / CIN" value={customer.passport_or_cin ?? "—"} />
          <DetailRow label="Driving license" value={customer.driving_license_number ?? "—"} />
          <DetailRow label="Member since" value={formatDateTime(customer.created_at)} />
        </div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reservations" value={stats.reservations_count} />
        <StatCard label="Total spent" value={formatCurrency(stats.total_paid)} />
        <StatCard label="Outstanding" value={formatCurrency(stats.total_outstanding)} />
        <StatCard label="Rental days" value={stats.total_days} />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completed" value={stats.completed_count} />
        <StatCard label="Active" value={stats.active_count} />
        <StatCard label="Cancelled" value={stats.cancelled_count} />
        <StatCard
          label="Avg. booking"
          value={formatCurrency(stats.average_booking_value)}
          hint={`Booked total: ${formatCurrency(stats.total_booked)}`}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Booking activity">
          <DetailRow
            label="First reservation"
            value={stats.first_reservation_at ? formatDateTime(stats.first_reservation_at) : "—"}
          />
          <DetailRow
            label="Last reservation"
            value={stats.last_reservation_at ? formatDateTime(stats.last_reservation_at) : "—"}
          />
          <DetailRow
            label="Favorite vehicle"
            value={
              stats.favorite_vehicle
                ? `${stats.favorite_vehicle.name} (${stats.favorite_vehicle.rentals_count} rentals)`
                : "—"
            }
          />
        </SectionCard>
      </div>

      <SectionCard title="Reservation history">
        {reservations.length === 0 ? (
          <p className="text-sm text-gray-500">No reservations yet for this customer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left">Reservation</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Dates</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="font-semibold text-[#3563E9] hover:underline"
                      >
                        {reservation.reservation_number}
                      </Link>
                      <p className="mt-1 text-xs text-gray-400">
                        {reservation.total_days} day{reservation.total_days === 1 ? "" : "s"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{reservation.vehicle.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <p>{formatDateTime(reservation.start_datetime)}</p>
                      <p className="mt-1">{formatDateTime(reservation.end_datetime)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={reservation.status.name}
                        className={getReservationStatusBadgeClass(reservation.status.slug)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={reservation.payment_status.name}
                        className={getPaymentStatusBadgeClass(reservation.payment_status.slug)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(reservation.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
