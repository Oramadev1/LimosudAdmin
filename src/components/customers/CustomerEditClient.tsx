"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { getCustomer, updateCustomer } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAdminQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { CreateCustomerPayload } from "@/types/api";
import {
  AdminFormField,
  ErrorMessage,
  FormGlobalError,
  inputErrorClass,
  PageHeader,
} from "@/components/ui/AdminUi";

export function CustomerEditClient({ id }: { id: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const returnTo = searchParams.get("returnTo");
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError } =
    useAdminFormErrors();
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    phone: "",
    email: "",
    address: "",
    foreign_address: "",
    passport_or_cin: "",
    passport_or_cin_issued_at: "",
    driving_license_number: "",
    driving_license_issued_at: "",
    driving_license_expires_at: "",
    driving_license_country: "",
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
      address: customer.address ?? "",
      foreign_address: customer.foreign_address ?? "",
      passport_or_cin: customer.passport_or_cin ?? "",
      passport_or_cin_issued_at: customer.passport_or_cin_issued_at?.slice(0, 10) ?? "",
      driving_license_number: customer.driving_license_number ?? "",
      driving_license_issued_at: customer.driving_license_issued_at?.slice(0, 10) ?? "",
      driving_license_expires_at: customer.driving_license_expires_at?.slice(0, 10) ?? "",
      driving_license_country: customer.driving_license_country ?? "",
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
    resetErrors();

    try {
      await saveMutation.mutateAsync({
        full_name: form.full_name,
        nationality: form.nationality,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        foreign_address: form.foreign_address || null,
        passport_or_cin: form.passport_or_cin || null,
        passport_or_cin_issued_at: form.passport_or_cin_issued_at || null,
        driving_license_number: form.driving_license_number || null,
        driving_license_issued_at: form.driving_license_issued_at || null,
        driving_license_expires_at: form.driving_license_expires_at || null,
        driving_license_country: form.driving_license_country || null,
      });
    } catch (err) {
      applySubmissionError(err, "Save failed.");
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
        <FormGlobalError message={globalError} />

        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField label="Full name" error={fieldErrors.full_name}>
            <input
              value={form.full_name}
              onChange={(event) => {
                setForm((current) => ({ ...current, full_name: event.target.value }));
                clearFieldError("full_name");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.full_name)}`}
              required
            />
          </AdminFormField>
          <AdminFormField label="Nationality" error={fieldErrors.nationality}>
            <input
              value={form.nationality}
              onChange={(event) => {
                setForm((current) => ({ ...current, nationality: event.target.value }));
                clearFieldError("nationality");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.nationality)}`}
              required
            />
          </AdminFormField>
          <AdminFormField label="Phone" error={fieldErrors.phone}>
            <input
              value={form.phone}
              onChange={(event) => {
                setForm((current) => ({ ...current, phone: event.target.value }));
                clearFieldError("phone");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.phone)}`}
              required
            />
          </AdminFormField>
          <AdminFormField label="Email" error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }));
                clearFieldError("email");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.email)}`}
            />
          </AdminFormField>
          <AdminFormField label="Passport / CIN" error={fieldErrors.passport_or_cin}>
            <input
              value={form.passport_or_cin}
              onChange={(event) => {
                setForm((current) => ({ ...current, passport_or_cin: event.target.value }));
                clearFieldError("passport_or_cin");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.passport_or_cin)}`}
            />
          </AdminFormField>
          <AdminFormField label="Driving license" error={fieldErrors.driving_license_number}>
            <input
              value={form.driving_license_number}
              onChange={(event) => {
                setForm((current) => ({ ...current, driving_license_number: event.target.value }));
                clearFieldError("driving_license_number");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.driving_license_number)}`}
            />
          </AdminFormField>
          <AdminFormField label="Address" error={fieldErrors.address}>
            <input
              value={form.address}
              onChange={(event) => {
                setForm((current) => ({ ...current, address: event.target.value }));
                clearFieldError("address");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.address)}`}
            />
          </AdminFormField>
          <AdminFormField label="Foreign address" error={fieldErrors.foreign_address}>
            <input
              value={form.foreign_address}
              onChange={(event) => {
                setForm((current) => ({ ...current, foreign_address: event.target.value }));
                clearFieldError("foreign_address");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.foreign_address)}`}
            />
          </AdminFormField>
          <AdminFormField label="License issued at" error={fieldErrors.driving_license_issued_at}>
            <input
              type="date"
              value={form.driving_license_issued_at}
              onChange={(event) => {
                setForm((current) => ({ ...current, driving_license_issued_at: event.target.value }));
                clearFieldError("driving_license_issued_at");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.driving_license_issued_at)}`}
            />
          </AdminFormField>
          <AdminFormField label="License expires at" error={fieldErrors.driving_license_expires_at}>
            <input
              type="date"
              value={form.driving_license_expires_at}
              onChange={(event) => {
                setForm((current) => ({ ...current, driving_license_expires_at: event.target.value }));
                clearFieldError("driving_license_expires_at");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.driving_license_expires_at)}`}
            />
          </AdminFormField>
          <AdminFormField label="License country" error={fieldErrors.driving_license_country}>
            <input
              value={form.driving_license_country}
              onChange={(event) => {
                setForm((current) => ({ ...current, driving_license_country: event.target.value }));
                clearFieldError("driving_license_country");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.driving_license_country)}`}
            />
          </AdminFormField>
          <AdminFormField label="Passport/CIN issued at" error={fieldErrors.passport_or_cin_issued_at}>
            <input
              type="date"
              value={form.passport_or_cin_issued_at}
              onChange={(event) => {
                setForm((current) => ({ ...current, passport_or_cin_issued_at: event.target.value }));
                clearFieldError("passport_or_cin_issued_at");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.passport_or_cin_issued_at)}`}
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
