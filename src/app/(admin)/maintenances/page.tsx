"use client";

import { FormEvent, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMaintenance,
  deleteMaintenance,
  getMaintenances,
  getUpcomingMaintenances,
  getVehicles,
  updateMaintenance,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Maintenance } from "@/types/api";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";

export default function MaintenancesPage() {
  const queryClient = useQueryClient();
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"all" | "upcoming">("all");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    vehicle_id: "",
    maintenance_type_slug: "oil_change",
    maintenance_date: new Date().toISOString().slice(0, 10),
    next_maintenance_date: "",
    mileage: "",
    cost: "",
    garage_name: "",
    notes: "",
  });

  const { data: vehicles } = useQuery({ queryKey: queryKeys.vehicles(1), queryFn: () => getVehicles(1) });

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: view === "upcoming" ? queryKeys.upcomingMaintenances(page) : queryKeys.maintenances(page),
    queryFn: () => (view === "upcoming" ? getUpcomingMaintenances(page) : getMaintenances(page)),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createMaintenance>[0] & { id?: number }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateMaintenance(id, body);
      }
      return createMaintenance(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenance,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenances"] }),
  });

  const maintenances = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await saveMutation.mutateAsync({
        vehicle_id: Number(form.vehicle_id),
        maintenance_type_slug: form.maintenance_type_slug,
        maintenance_date: form.maintenance_date,
        next_maintenance_date: form.next_maintenance_date || null,
        mileage: form.mileage ? Number(form.mileage) : null,
        cost: form.cost ? Number(form.cost) : null,
        garage_name: form.garage_name || null,
        notes: form.notes || null,
        ...(editingId ? { id: editingId } : {}),
      });
      setEditingId(null);
      setForm({
        vehicle_id: "",
        maintenance_type_slug: "oil_change",
        maintenance_date: new Date().toISOString().slice(0, 10),
        next_maintenance_date: "",
        mileage: "",
        cost: "",
        garage_name: "",
        notes: "",
      });
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Save failed.",
      );
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load maintenance records." : null;

  return (
    <div>
      <PageHeader title="Maintenance" description="Vehicle service history and upcoming maintenance." />

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

      <form onSubmit={handleSubmit} className="admin-card mb-6 grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">
          {editingId ? "Edit maintenance" : "Add maintenance"}
        </h2>
        <select
          value={form.vehicle_id}
          onChange={(e) => setForm((c) => ({ ...c, vehicle_id: e.target.value }))}
          className="admin-input"
          required
        >
          <option value="">Select vehicle</option>
          {vehicles?.data.map((v) => (
            <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>
          ))}
        </select>
        <select
          value={form.maintenance_type_slug}
          onChange={(e) => setForm((c) => ({ ...c, maintenance_type_slug: e.target.value }))}
          className="admin-input"
        >
          {lookups?.maintenance_types.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <input type="date" value={form.maintenance_date} onChange={(e) => setForm((c) => ({ ...c, maintenance_date: e.target.value }))} className="admin-input" required />
        <input type="date" value={form.next_maintenance_date} onChange={(e) => setForm((c) => ({ ...c, next_maintenance_date: e.target.value }))} className="admin-input" />
        <input placeholder="Mileage" value={form.mileage} onChange={(e) => setForm((c) => ({ ...c, mileage: e.target.value }))} className="admin-input" />
        <input placeholder="Cost" value={form.cost} onChange={(e) => setForm((c) => ({ ...c, cost: e.target.value }))} className="admin-input" />
        <input placeholder="Garage name" value={form.garage_name} onChange={(e) => setForm((c) => ({ ...c, garage_name: e.target.value }))} className="admin-input md:col-span-2" />
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} className="admin-input min-h-20 md:col-span-2" />
        <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary md:col-span-2">
          {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
        </button>
      </form>

      {submitError ? <ErrorMessage message={submitError} /> : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : maintenances.length === 0 ? (
        <EmptyState title="No maintenance records" description="Add service records for your fleet." />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
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
                  <td className="px-4 py-3">{item.next_maintenance_date ? formatDateTime(item.next_maintenance_date) : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline"
                        onClick={() => {
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
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete maintenance record?")) return;
                          await deleteMutation.mutateAsync(item.id);
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
