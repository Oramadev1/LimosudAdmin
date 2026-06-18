"use client";

import { FormEvent, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createExpense,
  deleteExpense,
  getExpenseMonthlySummary,
  getExpenses,
  getVehicles,
  updateExpense,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Expense } from "@/types/api";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    vehicle_id: "",
    expense_category_slug: "fuel",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const { data: vehicles } = useQuery({ queryKey: queryKeys.vehicles(1), queryFn: () => getVehicles(1) });

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.expenses(page),
    queryFn: () => getExpenses(page),
    placeholderData: keepPreviousData,
  });

  const { data: summary } = useQuery({
    queryKey: queryKeys.expenseSummary(),
    queryFn: () => getExpenseMonthlySummary(),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof createExpense>[0] & { id?: number }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateExpense(id, body, invoiceFile ?? undefined);
      }
      return createExpense(payload, invoiceFile ?? undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setInvoiceFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const expenses = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await saveMutation.mutateAsync({
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        expense_category_slug: form.expense_category_slug,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        description: form.description || null,
        ...(editingId ? { id: editingId } : {}),
      });
      setEditingId(null);
      setForm({
        vehicle_id: "",
        expense_category_slug: "fuel",
        amount: "",
        expense_date: new Date().toISOString().slice(0, 10),
        description: "",
      });
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Save failed.",
      );
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
      />

      <form onSubmit={handleSubmit} className="admin-card mb-6 grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">{editingId ? "Edit expense" : "Add expense"}</h2>
        <select
          value={form.vehicle_id}
          onChange={(e) => setForm((c) => ({ ...c, vehicle_id: e.target.value }))}
          className="admin-input"
        >
          <option value="">No vehicle (general expense)</option>
          {vehicles?.data.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select
          value={form.expense_category_slug}
          onChange={(e) => setForm((c) => ({ ...c, expense_category_slug: e.target.value }))}
          className="admin-input"
        >
          {lookups?.expense_categories.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} className="admin-input" required />
        <input type="date" value={form.expense_date} onChange={(e) => setForm((c) => ({ ...c, expense_date: e.target.value }))} className="admin-input" required />
        <input placeholder="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="admin-input md:col-span-2" />
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} className="md:col-span-2 text-sm" />
        <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary md:col-span-2">
          {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
        </button>
      </form>

      {submitError ? <ErrorMessage message={submitError} /> : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : expenses.length === 0 ? (
        <EmptyState title="No expenses" description="Add expenses to track fleet costs." />
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
                        onClick={() => {
                          setEditingId(expense.id);
                          setForm({
                            vehicle_id: expense.vehicle ? String(expense.vehicle.id) : "",
                            expense_category_slug: expense.expense_category.slug,
                            amount: expense.amount,
                            expense_date: expense.expense_date.slice(0, 10),
                            description: expense.description ?? "",
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete expense?")) return;
                          await deleteMutation.mutateAsync(expense.id);
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
    </div>
  );
}
