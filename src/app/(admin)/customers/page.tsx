"use client";

import { FormEvent, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { Customer } from "@/types/api";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    phone: "",
    email: "",
    passport_or_cin: "",
    driving_license_number: "",
  });

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.customers(page),
    queryFn: () => getCustomers(page),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useLockedMutation({
    mutationFn: (payload: Parameters<typeof createCustomer>[0] & { id?: number }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateCustomer(id, body);
      }
      return createCustomer(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const customers = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const resetForm = () => {
    setEditingId(null);
    setForm({
      full_name: "",
      nationality: "",
      phone: "",
      email: "",
      passport_or_cin: "",
      driving_license_number: "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await saveMutation.mutateAsync({
        full_name: form.full_name,
        nationality: form.nationality,
        phone: form.phone,
        email: form.email || null,
        passport_or_cin: form.passport_or_cin || null,
        driving_license_number: form.driving_license_number || null,
        ...(editingId ? { id: editingId } : {}),
      });
      resetForm();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Save failed.",
      );
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load customers." : null;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer records from bookings and manual admin entries."
      />

      <form onSubmit={handleSubmit} className="admin-card mb-6 grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold text-gray-900">
          {editingId ? "Edit customer" : "Add customer"}
        </h2>
        {[
          ["full_name", "Full name"],
          ["nationality", "Nationality"],
          ["phone", "Phone"],
          ["email", "Email"],
          ["passport_or_cin", "Passport / CIN"],
          ["driving_license_number", "Driving license"],
        ].map(([key, label]) => (
          <input
            key={key}
            placeholder={label}
            value={form[key as keyof typeof form]}
            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            className="admin-input"
            required={["full_name", "nationality", "phone"].includes(key)}
          />
        ))}
        <div className="md:col-span-2 flex gap-3">
          <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
            {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
          </button>
          {editingId ? (
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {submitError ? <ErrorMessage message={submitError} /> : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : customers.length === 0 ? (
        <EmptyState title="No customers" description="Customers appear here after bookings or manual creation." />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: Customer) => (
                <tr key={customer.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-semibold">{customer.full_name}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">{customer.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline"
                        onClick={() => {
                          setEditingId(customer.id);
                          setForm({
                            full_name: customer.full_name,
                            nationality: customer.nationality,
                            phone: customer.phone,
                            email: customer.email ?? "",
                            passport_or_cin: customer.passport_or_cin ?? "",
                            driving_license_number: customer.driving_license_number ?? "",
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete customer?")) return;
                          await deleteMutation.mutateAsync(customer.id);
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
