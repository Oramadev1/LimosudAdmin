"use client";

import { FormEvent, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  cancelPayment,
  createPayment,
  getPayments,
  getReservations,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { canRecordPayment } from "@/lib/reservation-workflow";
import { useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    reservation_id: "",
    payment_method_slug: "cash",
    payment_type_slug: "rental_payment",
    payment_status_slug: "paid",
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  });

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.payments(page),
    queryFn: () => getPayments(page),
    placeholderData: keepPreviousData,
  });

  const { data: reservations } = useQuery({
    queryKey: queryKeys.reservations(1),
    queryFn: () => getReservations(1),
  });

  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });

  const payments = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const payableReservations =
    reservations?.data.filter((reservation) => canRecordPayment(reservation.status.slug)) ?? [];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await createMutation.mutateAsync({
        reservation_id: Number(form.reservation_id),
        payment_method_slug: form.payment_method_slug,
        payment_type_slug: form.payment_type_slug,
        payment_status_slug: form.payment_status_slug,
        amount: Number(form.amount),
        payment_date: form.payment_date,
        reference: form.reference || null,
        notes: form.notes || null,
      });
      setForm((c) => ({ ...c, amount: "", reference: "", notes: "" }));
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Save failed.",
      );
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load payments." : null;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record offline payments (cash, bank transfer, etc.)."
      />

      <form onSubmit={handleSubmit} className="admin-card mb-6 grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">Record payment</h2>
        <select
          value={form.reservation_id}
          onChange={(e) => setForm((c) => ({ ...c, reservation_id: e.target.value }))}
          className="admin-input"
          required
        >
          <option value="">Select reservation</option>
          {payableReservations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.reservation_number} — {r.customer.full_name} ({r.status.name})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
          className="admin-input"
          required
        />
        <input
          type="date"
          value={form.payment_date}
          onChange={(e) => setForm((c) => ({ ...c, payment_date: e.target.value }))}
          className="admin-input"
          required
        />
        <select
          value={form.payment_method_slug}
          onChange={(e) => setForm((c) => ({ ...c, payment_method_slug: e.target.value }))}
          className="admin-input"
        >
          {lookups?.payment_methods.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <select
          value={form.payment_type_slug}
          onChange={(e) => setForm((c) => ({ ...c, payment_type_slug: e.target.value }))}
          className="admin-input"
        >
          {lookups?.payment_types.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <button type="submit" disabled={createMutation.isPending} className="admin-btn-primary md:col-span-2">
          {createMutation.isPending ? "Saving..." : "Add payment"}
        </button>
      </form>

      {submitError ? <ErrorMessage message={submitError} /> : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : payments.length === 0 ? (
        <EmptyState title="No payments" description="Recorded payments will appear here." />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reservation</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-semibold">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3">{payment.payment_method.name}</td>
                  <td className="px-4 py-3">{payment.payment_status.name}</td>
                  <td className="px-4 py-3">{payment.reservation?.reservation_number ?? "—"}</td>
                  <td className="px-4 py-3">{formatDateTime(payment.payment_date)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-red-500 hover:underline"
                      onClick={async () => {
                        if (!confirm("Cancel this payment?")) return;
                        await cancelMutation.mutateAsync(payment.id);
                      }}
                    >
                      Cancel
                    </button>
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
