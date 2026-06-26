"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { getCustomer, updateCustomer } from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { useAdminQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { CreateCustomerPayload } from "@/types/api";
import { AdminFormField, ErrorMessage, PageHeader } from "@/components/ui/AdminUi";

export function CustomerEditClient({ id }: { id: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const returnTo = searchParams.get("returnTo");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    phone: "",
    email: "",
    passport_or_cin: "",
    driving_license_number: "",
  });

  const { data, isPending, error } = useAdminQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => getCustomer(id),
  });

  useEffect(() => {
    if (!data?.data) {
      return;
    }

    const customer = data.data;
    setForm({
      full_name: customer.full_name,
      nationality: customer.nationality,
      phone: customer.phone,
      email: customer.email ?? "",
      passport_or_cin: customer.passport_or_cin ?? "",
      driving_license_number: customer.driving_license_number ?? "",
    });
  }, [data]);

  const saveMutation = useLockedMutation({
    mutationFn: (payload: CreateCustomerPayload) => updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(id) });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["reservation"] });
      router.push(returnTo && returnTo.startsWith("/") ? returnTo : `/customers/${id}`);
    },
  });

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
      });
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Save failed.",
      );
    }
  };

  if (isPending) {
    return <div className="admin-card p-6 text-sm text-gray-500">Loading customer...</div>;
  }

  if (error || !data) {
    const message =
      error instanceof ApiError ? error.message : error ? "Failed to load customer." : "Customer not found.";
    return <ErrorMessage message={message} />;
  }

  const backHref = returnTo && returnTo.startsWith("/") ? returnTo : `/customers/${id}`;

  return (
    <div>
      <Link href={backHref} className="admin-btn-secondary admin-btn-sm mb-4">
        ← Back
      </Link>

      <PageHeader
        title="Edit customer"
        description={`Update profile details for ${data.data.full_name}.`}
      />

      <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6">
        {submitError ? <ErrorMessage message={submitError} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField label="Full name">
            <input
              value={form.full_name}
              onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
              className="admin-input"
              required
            />
          </AdminFormField>
          <AdminFormField label="Nationality">
            <input
              value={form.nationality}
              onChange={(event) => setForm((current) => ({ ...current, nationality: event.target.value }))}
              className="admin-input"
              required
            />
          </AdminFormField>
          <AdminFormField label="Phone">
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="admin-input"
              required
            />
          </AdminFormField>
          <AdminFormField label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="admin-input"
            />
          </AdminFormField>
          <AdminFormField label="Passport / CIN">
            <input
              value={form.passport_or_cin}
              onChange={(event) =>
                setForm((current) => ({ ...current, passport_or_cin: event.target.value }))
              }
              className="admin-input"
            />
          </AdminFormField>
          <AdminFormField label="Driving license">
            <input
              value={form.driving_license_number}
              onChange={(event) =>
                setForm((current) => ({ ...current, driving_license_number: event.target.value }))
              }
              className="admin-input"
            />
          </AdminFormField>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
            {saveMutation.isPending ? "Saving..." : "Save changes"}
          </button>
          <Link href={backHref} className="admin-btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
