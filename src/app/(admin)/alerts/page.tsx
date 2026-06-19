"use client";

import { FormEvent, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  alertAction,
  createAlert,
  generateAlerts,
  getAlerts,
  getPendingAlerts,
  getVehicles,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicle_id: "",
    alert_type_slug: "maintenance_due",
    title: "",
    message: "",
    due_date: "",
  });

  const { data: vehicles } = useQuery({ queryKey: queryKeys.vehicles(1), queryFn: () => getVehicles(1) });

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.alerts(page),
    queryFn: () => getAlerts(page),
    placeholderData: keepPreviousData,
  });

  const { data: pendingData } = useQuery({
    queryKey: queryKeys.pendingAlerts(1),
    queryFn: () => getPendingAlerts(1),
  });

  const createMutation = useLockedMutation({
    mutationFn: createAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const generateMutation = useLockedMutation({
    mutationFn: generateAlerts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const actionMutation = useLockedMutation({
    mutationFn: ({ id, action }: { id: number; action: "seen" | "done" | "ignore" }) =>
      alertAction(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const alerts = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const pendingCount = pendingData?.meta.total ?? pendingData?.data.length ?? 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await createMutation.mutateAsync({
        vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
        alert_type_slug: form.alert_type_slug,
        title: form.title,
        message: form.message || null,
        due_date: form.due_date || null,
      });
      setForm({ vehicle_id: "", alert_type_slug: "maintenance_due", title: "", message: "", due_date: "" });
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Create failed.",
      );
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load alerts." : null;

  return (
    <div>
      <PageHeader title="Alerts" description={`Pending alerts: ${pendingCount}`} />

      <div className="admin-card mb-4 flex flex-wrap gap-3 p-4">
        <button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="admin-btn-secondary"
        >
          {generateMutation.isPending ? "Generating..." : "Generate system alerts"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-card mb-6 grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">Create alert</h2>
        <select value={form.vehicle_id} onChange={(e) => setForm((c) => ({ ...c, vehicle_id: e.target.value }))} className="admin-input">
          <option value="">No vehicle</option>
          {vehicles?.data.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select value={form.alert_type_slug} onChange={(e) => setForm((c) => ({ ...c, alert_type_slug: e.target.value }))} className="admin-input">
          {lookups?.alert_types.map((item) => (
            <option key={item.slug} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <input placeholder="Title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} className="admin-input md:col-span-2" required />
        <textarea placeholder="Message" value={form.message} onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))} className="admin-input min-h-20 md:col-span-2" />
        <input type="date" value={form.due_date} onChange={(e) => setForm((c) => ({ ...c, due_date: e.target.value }))} className="admin-input" />
        <button type="submit" disabled={createMutation.isPending} className="admin-btn-primary">
          {createMutation.isPending ? "Creating..." : "Create alert"}
        </button>
      </form>

      {submitError ? <ErrorMessage message={submitError} /> : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : alerts.length === 0 ? (
        <EmptyState title="No alerts" description="System alerts will appear here." />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{alert.title}</div>
                    <div className="text-xs text-gray-400">{alert.message}</div>
                  </td>
                  <td className="px-4 py-3">{alert.alert_type.name}</td>
                  <td className="px-4 py-3">{alert.alert_status.name}</td>
                  <td className="px-4 py-3">{formatDateTime(alert.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(["seen", "done", "ignore"] as const).map((action) => (
                        <button
                          key={action}
                          type="button"
                          className="text-[#3563E9] hover:underline capitalize"
                          onClick={() => actionMutation.mutate({ id: alert.id, action })}
                        >
                          {action}
                        </button>
                      ))}
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
