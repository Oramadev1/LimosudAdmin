"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createCustomer,
  deleteCustomer,
  getCustomers,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Customer } from "@/types/api";
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
  full_name: "",
  nationality: "",
  phone: "",
  email: "",
  passport_or_cin: "",
  driving_license_number: "",
};

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError } = useAdminFormErrors();

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.customers(page),
    () => getCustomers(page),
  );

  const saveMutation = useLockedMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      resetForm();
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const customers = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

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
      await saveMutation.mutateAsync({
        full_name: form.full_name,
        nationality: form.nationality,
        phone: form.phone,
        email: form.email || null,
        passport_or_cin: form.passport_or_cin || null,
        driving_license_number: form.driving_license_number || null,
      });
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load customers." : null;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customer records from bookings and manual admin entries."
        actionLabel="Add customer"
        onActionClick={openCreateForm}
      />

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers"
          description="Customers appear here after bookings or manual creation."
          actionLabel="Add customer"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Reservations</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: Customer) => (
                <tr key={customer.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-semibold">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-[#3563E9] hover:underline"
                    >
                      {customer.full_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">{customer.email ?? "—"}</td>
                  <td className="px-4 py-3">{customer.reservations_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-[#3563E9] hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/customers/${customer.id}/edit?returnTo=/customers`}
                        className="text-[#3563E9] hover:underline"
                      >
                        Edit
                      </Link>
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

      <AdminCollapsibleFormCard open={showForm} title="Add customer" formRef={formRef}>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <FormGlobalError message={globalError} />
          {[
            ["full_name", "Full name"],
            ["nationality", "Nationality"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["passport_or_cin", "Passport / CIN"],
            ["driving_license_number", "Driving license"],
          ].map(([key, label]) => (
            <AdminFormField key={key} error={fieldErrors[key]}>
              <input
                placeholder={label}
                value={form[key as keyof typeof form]}
                onChange={(event) => {
                  setForm((current) => ({ ...current, [key]: event.target.value }));
                  clearFieldError(key);
                }}
                className={`admin-input ${inputErrorClass(fieldErrors[key])}`}
                required={["full_name", "nationality", "phone"].includes(key)}
              />
            </AdminFormField>
          ))}
          <div className="md:col-span-2 flex gap-3">
            <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
              {saveMutation.isPending ? "Saving..." : "Create"}
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
