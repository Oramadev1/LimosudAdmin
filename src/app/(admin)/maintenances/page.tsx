"use client";

import { FormEvent, useRef, useState } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createMaintenance,
  deleteMaintenance,
  getMaintenances,
  getUpcomingMaintenances,
  getVehicles,
  updateMaintenance,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { mapValidationErrors, summarizeValidationErrors } from "@/lib/validation";
import { useAdminQuery, useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Maintenance } from "@/types/api";
import {
  AdminCollapsibleFormCard,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
  scrollToAdminForm,
} from "@/components/ui/AdminUi";

const emptyForm = {
  vehicle_id: "",
  maintenance_type_slug: "oil_change",
  maintenance_date: new Date().toISOString().slice(0, 10),
  next_maintenance_date: "",
  mileage: "",
  cost: "",
  garage_name: "",
  notes: "",
};

const FIELD_LABELS: Record<string, string> = {
  vehicle_id: "Vehicle",
  maintenance_type_slug: "Maintenance type",
  maintenance_date: "Maintenance date",
  next_maintenance_date: "Next maintenance date",
  mileage: "Mileage",
  cost: "Cost",
  garage_name: "Garage name",
  notes: "Notes",
};

export default function MaintenancesPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"all" | "upcoming">("all");
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vehicles } = useAdminQuery({ queryKey: queryKeys.vehicles(1), queryFn: () => getVehicles(1) });

  const { data, isPending, isFetching, error } = useAdminQuery({
    queryKey: view === "upcoming" ? queryKeys.upcomingMaintenances(page) : queryKeys.maintenances(page),
    queryFn: () => (view === "upcoming" ? getUpcomingMaintenances(page) : getMaintenances(page)),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useLockedMutation({
    mutationFn: (payload: Parameters<typeof createMaintenance>[0] & { id?: number }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateMaintenance(id, body);
      }
      return createMaintenance(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenances"] });
      resetForm();
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteMaintenance,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
  });

  const maintenances = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
    setSubmitError(null);
    setFieldErrors({});
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSubmitError(null);
    setFieldErrors({});
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const startEdit = (item: Maintenance) => {
    setEditingId(item.id);
    setForm({
      vehicle_id: String(item.vehicle.id),
      maintenance_type_slug: item.maintenance_type.slug,
      maintenance_date: item.maintenance_date.slice(0, 10),
      next_maintenance_date: item.next_maintenance_date?.slice(0, 10) ?? "",
      mileage: item.mileage ? String(item.mileage) : "",
      cost: item.cost ?? "",
      garage_name: item.garage_name ?? "",
      notes: item.notes ?? "",
    });
    setSubmitError(null);
    setFieldErrors({});
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};

    if (!form.vehicle_id) {
      localErrors.vehicle_id = "Please select a vehicle.";
    }

    if (!form.maintenance_type_slug) {
      localErrors.maintenance_type_slug = "Please select a maintenance type.";
    }

    if (!form.maintenance_date) {
      localErrors.maintenance_date = "Please enter the maintenance date.";
    }

    if (!form.cost.trim()) {
      localErrors.cost = "Please enter the maintenance cost.";
    } else if (!Number.isFinite(Number(form.cost)) || Number(form.cost) <= 0) {
      localErrors.cost = "The maintenance cost must be greater than zero.";
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setSubmitError("Please fill in the required fields highlighted below.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        vehicle_id: Number(form.vehicle_id),
        maintenance_type_slug: form.maintenance_type_slug,
        maintenance_date: form.maintenance_date,
        next_maintenance_date: form.next_maintenance_date || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        cost: Number(form.cost),
        garage_name: form.garage_name || null,
        notes: form.notes || null,
        ...(editingId ? { id: editingId } : {}),
      });
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;

      if (isValidationError(body)) {
        setFieldErrors(mapValidationErrors(body.errors));
        setSubmitError(summarizeValidationErrors(body, FIELD_LABELS));
        return;
      }

      setSubmitError(err instanceof ApiError ? err.message : "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load maintenance records." : null;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Vehicle service history and upcoming maintenance."
        actionLabel="Add maintenance"
        onActionClick={openCreateForm}
      />

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView("all")}
          className={view === "all" ? "admin-btn-primary" : "admin-btn-secondary"}
        >
          All records
        </button>
        <button
          type="button"
          onClick={() => setView("upcoming")}
          className={view === "upcoming" ? "admin-btn-primary" : "admin-btn-secondary"}
        >
          Upcoming
        </button>
      </div>

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : maintenances.length === 0 ? (
        <EmptyState
          title="No maintenance records"
          description="Add service records for your fleet."
          actionLabel="Add maintenance"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Next due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenances.map((item: Maintenance) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">{item.vehicle.name}</td>
                  <td className="px-4 py-3">{item.maintenance_type.name}</td>
                  <td className="px-4 py-3">{formatDateTime(item.maintenance_date)}</td>
                  <td className="px-4 py-3 font-semibold">
                    {item.cost ? formatCurrency(item.cost) : "—"}
                  </td>
                  <td className="px-4 py-3">{item.next_maintenance_date ? formatDateTime(item.next_maintenance_date) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete maintenance record?")) return;
                          await deleteMutation.mutateAsync(item.id);
                          if (editingId === item.id) resetForm();
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
        title={editingId ? "Edit maintenance" : "Add maintenance"}
        formRef={formRef}
      >
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {submitError ? <div className="md:col-span-2"><ErrorMessage message={submitError} /></div> : null}
          <div>
            <select
              value={form.vehicle_id}
              onChange={(e) => {
                setForm((c) => ({ ...c, vehicle_id: e.target.value }));
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.vehicle_id;
                  return next;
                });
              }}
              className={`admin-input ${fieldErrors.vehicle_id ? "border-red-400" : ""}`}
              required
            >
              <option value="">Select vehicle</option>
              {vehicles?.data.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>
              ))}
            </select>
            {fieldErrors.vehicle_id ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.vehicle_id}</p>
            ) : null}
          </div>
          <div>
            <select
              value={form.maintenance_type_slug}
              onChange={(e) => {
                setForm((c) => ({ ...c, maintenance_type_slug: e.target.value }));
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.maintenance_type_slug;
                  return next;
                });
              }}
              className={`admin-input ${fieldErrors.maintenance_type_slug ? "border-red-400" : ""}`}
              required
            >
              <option value="">Select type</option>
              {lookups?.maintenance_types.map((item) => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
              ))}
            </select>
            {fieldErrors.maintenance_type_slug ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.maintenance_type_slug}</p>
            ) : null}
          </div>
          <div>
            <input
              type="date"
              value={form.maintenance_date}
              onChange={(e) => {
                setForm((c) => ({ ...c, maintenance_date: e.target.value }));
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.maintenance_date;
                  return next;
                });
              }}
              className={`admin-input ${fieldErrors.maintenance_date ? "border-red-400" : ""}`}
              required
            />
            {fieldErrors.maintenance_date ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.maintenance_date}</p>
            ) : null}
          </div>
          <div>
            <input
              type="date"
              value={form.next_maintenance_date}
              onChange={(e) => setForm((c) => ({ ...c, next_maintenance_date: e.target.value }))}
              className={`admin-input ${fieldErrors.next_maintenance_date ? "border-red-400" : ""}`}
            />
            {fieldErrors.next_maintenance_date ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.next_maintenance_date}</p>
            ) : null}
          </div>
          <div>
            <input
              placeholder="Mileage"
              value={form.mileage}
              onChange={(e) => setForm((c) => ({ ...c, mileage: e.target.value }))}
              className={`admin-input ${fieldErrors.mileage ? "border-red-400" : ""}`}
            />
            {fieldErrors.mileage ? <p className="mt-1 text-xs text-red-600">{fieldErrors.mileage}</p> : null}
          </div>
          <div>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Cost (MAD) *"
              value={form.cost}
              onChange={(e) => {
                setForm((c) => ({ ...c, cost: e.target.value }));
                setFieldErrors((current) => {
                  const next = { ...current };
                  delete next.cost;
                  return next;
                });
              }}
              className={`admin-input ${fieldErrors.cost ? "border-red-400" : ""}`}
              required
            />
            {fieldErrors.cost ? <p className="mt-1 text-xs text-red-600">{fieldErrors.cost}</p> : null}
          </div>
          <div className="md:col-span-2">
            <input
              placeholder="Garage name"
              value={form.garage_name}
              onChange={(e) => setForm((c) => ({ ...c, garage_name: e.target.value }))}
              className={`admin-input ${fieldErrors.garage_name ? "border-red-400" : ""}`}
            />
            {fieldErrors.garage_name ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.garage_name}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              className={`admin-input min-h-20 ${fieldErrors.notes ? "border-red-400" : ""}`}
            />
            {fieldErrors.notes ? <p className="mt-1 text-xs text-red-600">{fieldErrors.notes}</p> : null}
          </div>
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
