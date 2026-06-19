"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getReservations } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  getPaymentStatusBadgeClass,
  getReservationStatusBadgeClass,
} from "@/lib/reservation-status";
import { queryKeys } from "@/lib/query/keys";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";
import { StatusBadge } from "@/components/ui/StatusBadge";

const STATUS_FILTERS = [
  { slug: "all", label: "All" },
  { slug: "pending", label: "Pending" },
  { slug: "confirmed", label: "Confirmed" },
  { slug: "in_progress", label: "In progress" },
  { slug: "completed", label: "Completed" },
  { slug: "cancelled", label: "Cancelled" },
  { slug: "rejected", label: "Rejected" },
] as const;

export default function ReservationsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["slug"]>("all");

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.reservations(page),
    queryFn: () => getReservations(page),
    placeholderData: keepPreviousData,
  });

  const reservations = data?.data ?? [];
  const filteredReservations =
    statusFilter === "all"
      ? reservations
      : reservations.filter((reservation) => reservation.status.slug === statusFilter);
  const lastPage = data?.meta.last_page ?? 1;
  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load reservations." : null;

  return (
    <div>
      <PageHeader
        title="Reservations"
        description="Manage bookings from the website and admin panel."
        actionHref="/reservations/new"
        actionLabel="New reservation"
      />

      {loadError ? <ErrorMessage message={loadError} /> : null}

      <div className="admin-card mb-4 flex flex-wrap gap-2 p-3">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.slug;

          return (
            <button
              key={filter.slug}
              type="button"
              onClick={() => setStatusFilter(filter.slug)}
              className={
                active
                  ? "admin-btn-primary admin-btn-sm"
                  : "admin-btn-secondary admin-btn-sm"
              }
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading reservations...</div>
      ) : filteredReservations.length === 0 ? (
        <EmptyState
          title={statusFilter === "all" ? "No reservations" : "No matching reservations"}
          description={
            statusFilter === "all"
              ? "Reservations will appear here after bookings."
              : "Try another filter or create a new reservation."
          }
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#fafbfc]">
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="border-b border-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">{reservation.reservation_number}</div>
                    <div className="mt-1 text-xs text-gray-400">{reservation.source.name}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{reservation.customer.full_name}</div>
                    <div className="mt-1 text-xs text-gray-400">{reservation.customer.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-4 font-medium">{reservation.vehicle.name}</td>
                  <td className="px-4 py-4 text-xs leading-5 text-gray-600">
                    <div>{formatDateTime(reservation.start_datetime)}</div>
                    <div className="text-gray-400">to</div>
                    <div>{formatDateTime(reservation.end_datetime)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      label={reservation.status.name}
                      className={getReservationStatusBadgeClass(reservation.status.slug)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge
                      label={reservation.payment_status.name}
                      className={getPaymentStatusBadgeClass(reservation.payment_status.slug)}
                    />
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {formatCurrency(reservation.total_price)}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/reservations/${reservation.id}`}
                      className="admin-btn-secondary admin-btn-sm"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
