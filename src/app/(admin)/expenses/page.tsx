"use client";

import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createExpense,
  deleteExpense,
  getExpenseMonthlySummary,
  getExpenses,
  getVehicles,
  updateExpense,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAdminQuery, useLookupsQuery, usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Expense } from "@/types/api";
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
import { AdminFileUpload } from "@/components/ui/AdminFileUpload";

const emptyForm = {
  vehicle_id: "",
  expense_category_slug: "fuel",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  description: "",
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingHasInvoice, setEditingHasInvoice] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError } = useAdminFormErrors();

  const { data: vehicles } = useAdminQuery({ queryKey: queryKeys.vehicles(1), queryFn: () => getVehicles(1) });

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.expenses(page),
    () => getExpenses(page),
  );

  const { data: summary } = useAdminQuery({
    queryKey: queryKeys.expenseSummary(),
    queryFn: () => getExpenseMonthlySummary(),
  });

  const saveMutation = useLockedMutation({
    mutationFn: async (payload: Parameters<typeof createExpense>[0] & { id?: number }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateExpense(id, body, invoiceFile ?? undefined);
      }
      return createExpense(payload, invoiceFile ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const expenses = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditingHasInvoice(false);
    setInvoiceFile(null);
    setShowForm(false);
    resetErrors();
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditingHasInvoice(false);
    setInvoiceFile(null);
    resetErrors();
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      vehicle_id: expense.vehicle ? String(expense.vehicle.id) : "",
      expense_category_slug: expense.expense_category.slug,
      amount: expense.amount,
      expense_date: expense.expense_date.slice(0, 10),
      description: expense.description ?? "",
    });
    setEditingHasInvoice(expense.has_invoice);
    setInvoiceFile(null);
    resetErrors();
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetErrors();
    try {
      await saveMutation.mutateAsync({
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        expense_category_slug: form.expense_category_slug,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        description: form.description || null,
        ...(editingId ? { id: editingId } : {}),
      });
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load expenses." : null;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description={
          summary
            ? `This month: ${formatCurrency(summary.total_amount)} (${summary.expense_count} records)`
            : "Track fleet and business expenses."
        }
        actionLabel="Add expense"
        onActionClick={openCreateForm}
      />

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses"
          description="Add expenses to track fleet costs."
          actionLabel="Add expense"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense: Expense) => (
                <tr key={expense.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">{expense.expense_category.name}</td>
                  <td className="px-4 py-3">{expense.vehicle?.name ?? "General"}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(expense.amount)}</td>
                  <td className="px-4 py-3">{formatDateTime(expense.expense_date)}</td>
                  <td className="px-4 py-3">{expense.has_invoice ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline"
                        onClick={() => startEdit(expense)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete expense?")) return;
                          await deleteMutation.mutateAsync(expense.id);
                          if (editingId === expense.id) resetForm();
                        }}
                      >
                        Delete
                      </button>
                    </div>
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

      <AdminCollapsibleFormCard
        open={showForm}
        title={editingId ? "Edit expense" : "Add expense"}
        formRef={formRef}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <FormGlobalError message={globalError} />
          <AdminFormField error={fieldErrors.vehicle_id}>
            <select
              value={form.vehicle_id}
              onChange={(e) => {
                setForm((c) => ({ ...c, vehicle_id: e.target.value }));
                clearFieldError("vehicle_id");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.vehicle_id)}`}
            >
              <option value="">No vehicle (general expense)</option>
              {vehicles?.data.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField error={fieldErrors.expense_category_slug}>
            <select
              value={form.expense_category_slug}
              onChange={(e) => {
                setForm((c) => ({ ...c, expense_category_slug: e.target.value }));
                clearFieldError("expense_category_slug");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.expense_category_slug)}`}
            >
              {lookups?.expense_categories.map((item) => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
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
          <AdminFormField error={fieldErrors.expense_date}>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => {
                setForm((c) => ({ ...c, expense_date: e.target.value }));
                clearFieldError("expense_date");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.expense_date)}`}
              required
            />
          </AdminFormField>
          <AdminFormField className="md:col-span-2" error={fieldErrors.description}>
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => {
                setForm((c) => ({ ...c, description: e.target.value }));
                clearFieldError("description");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.description)}`}
            />
          </AdminFormField>
          <AdminFileUpload
            className="md:col-span-2"
            label="Invoice"
            error={fieldErrors.invoice}
            hint={
              editingId && editingHasInvoice
                ? "An invoice is already attached. Upload a new file to replace it."
                : "Optional. PDF or image (JPG, PNG, WEBP)."
            }
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            file={invoiceFile}
            onFileChange={setInvoiceFile}
            emptyTitle="Upload invoice"
            emptyHint="PDF, JPG, PNG, or WEBP"
          />
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
              {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      </AdminCollapsibleFormCard>
    </div>
  );
}
