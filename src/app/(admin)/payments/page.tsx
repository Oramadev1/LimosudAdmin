"use client";

import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  cancelPayment,
  createPayment,
  getPayments,
  getReservations,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { canRecordPayment } from "@/lib/reservation-workflow";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAdminQuery, useLookupsQuery, usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import {
  AdminCollapsibleFormCard,
  AdminFormField,
  EmptyState,
  ErrorMessage,
  FormGlobalError,
  inputErrorClass,
  PageHeader,
  Pagination,
  scrollToAdminForm,
} from "@/components/ui/AdminUi";

const emptyForm = {
  reservation_id: "",
  payment_method_slug: "cash",
  payment_type_slug: "rental_payment",
  payment_status_slug: "paid",
  amount: "",
  payment_date: new Date().toISOString().slice(0, 10),
  reference: "",
  notes: "",
};

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const { hasPermission } = useAuth();
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError } =
    useAdminFormErrors();

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.payments(page),
    () => getPayments(page),
  );

  const { data: reservations } = useAdminQuery({
    queryKey: [...queryKeys.reservations(1), "payable"],
    queryFn: () => getReservations(1, 100),
  });

  const createMutation = useLockedMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      resetForm();
    },
  });

  const cancelMutation = useLockedMutation({
    mutationFn: cancelPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  const payments = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const payableReservations =
    reservations?.data.filter((reservation) => canRecordPayment(reservation.status.slug)) ?? [];

  const canManagePayments = hasPermission("payments.manage");

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    resetErrors();
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    resetErrors();
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetErrors();
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
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load payments." : null;

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record offline payments (cash, bank transfer, etc.)."
        actionLabel={canManagePayments ? "Record payment" : undefined}
        onActionClick={canManagePayments ? openCreateForm : undefined}
      />

      {!canManagePayments ? (
        <div className="admin-card mb-6 p-6 text-sm text-gray-500">
          You do not have permission to record payments.
        </div>
      ) : null}

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments"
          description="Recorded payments will appear here."
          actionLabel={canManagePayments ? "Record payment" : undefined}
          onAction={canManagePayments ? openCreateForm : undefined}
        />
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
                    {canManagePayments && payment.payment_status.slug !== "cancelled" ? (
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
                    ) : (
                      "—"
                    )}
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

      {canManagePayments ? (
        <AdminCollapsibleFormCard open={showForm} title="Record payment" formRef={formRef}>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <FormGlobalError message={globalError} />
            <AdminFormField error={fieldErrors.reservation_id}>
              <select
                value={form.reservation_id}
                onChange={(e) => {
                  setForm((c) => ({ ...c, reservation_id: e.target.value }));
                  clearFieldError("reservation_id");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.reservation_id)}`}
                required
              >
                <option value="">Select reservation</option>
                {payableReservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reservation_number} — {r.customer.full_name} ({r.status.name})
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField error={fieldErrors.amount}>
              <input
                type="number"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => {
                  setForm((c) => ({ ...c, amount: e.target.value }));
                  clearFieldError("amount");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.amount)}`}
                required
              />
            </AdminFormField>
            <AdminFormField error={fieldErrors.payment_date}>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => {
                  setForm((c) => ({ ...c, payment_date: e.target.value }));
                  clearFieldError("payment_date");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.payment_date)}`}
                required
              />
            </AdminFormField>
            <AdminFormField error={fieldErrors.payment_method_slug}>
              <select
                value={form.payment_method_slug}
                onChange={(e) => {
                  setForm((c) => ({ ...c, payment_method_slug: e.target.value }));
                  clearFieldError("payment_method_slug");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.payment_method_slug)}`}
              >
                {lookups?.payment_methods.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField error={fieldErrors.payment_type_slug}>
              <select
                value={form.payment_type_slug}
                onChange={(e) => {
                  setForm((c) => ({ ...c, payment_type_slug: e.target.value }));
                  clearFieldError("payment_type_slug");
                }}
                className={`admin-input ${inputErrorClass(fieldErrors.payment_type_slug)}`}
              >
                {lookups?.payment_types.map((item) => (
                  <option key={item.slug} value={item.slug}>{item.name}</option>
                ))}
              </select>
            </AdminFormField>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="admin-btn-primary">
                {createMutation.isPending ? "Saving..." : "Add payment"}
              </button>
              <button type="button" className="admin-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </AdminCollapsibleFormCard>
      ) : null}
    </div>
  );
}
