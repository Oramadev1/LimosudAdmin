"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  getAlertContactMessageId,
  getAlertReservationId,
  getAlertStatusBadgeClass,
  getAlertTypeBadgeClass,
} from "@/lib/alert-styles";
import { formatDateTime } from "@/lib/format";
import { useAdminQuery, useLookupsQuery, usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import {
  AdminCollapsibleFormCard,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
  scrollToAdminForm,
} from "@/components/ui/AdminUi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Alert } from "@/types/api";

const emptyForm = {
  vehicle_id: "",
  alert_type_slug: "maintenance_due",
  title: "",
  message: "",
  due_date: "",
};

export default function AlertsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: vehicles } = useAdminQuery({ queryKey: queryKeys.vehicles(1), queryFn: () => getVehicles(1) });

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.alerts(page),
    () => getAlerts(page),
  );

  const { data: pendingData } = useAdminQuery({
    queryKey: queryKeys.pendingAlerts(1),
    queryFn: () => getPendingAlerts(1),
  });

  const createMutation = useLockedMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      resetForm();
    },
  });

  const generateMutation = useLockedMutation({
    mutationFn: generateAlerts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setGenerateMessage(
        result.total_created > 0
          ? `${result.total_created} new alert${result.total_created === 1 ? "" : "s"} created.`
          : "No new alerts — everything is already in the list.",
      );
    },
  });

  const actionMutation = useLockedMutation({
    mutationFn: ({ id, action }: { id: number; action: "done" | "ignore" }) =>
      alertAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setGenerateMessage(null);
    },
  });

  const alerts = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const pendingCount = pendingData?.meta.total ?? pendingData?.data.length ?? 0;

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
    setSubmitError(null);
  };

  const openCreateForm = () => {
    setForm(emptyForm);
    setSubmitError(null);
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const openReservation = (alert: Alert) => {
    const reservationId = getAlertReservationId(alert);
    if (reservationId) {
      router.push(`/reservations/${reservationId}`);
    }
  };

  const openContactMessage = (alert: Alert) => {
    const contactMessageId = getAlertContactMessageId(alert);
    if (contactMessageId) {
      router.push(`/contact-messages?message=${contactMessageId}`);
    }
  };

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
      <PageHeader
        title="Alerts"
        description={`Pending alerts: ${pendingCount}`}
        actionLabel="Create alert"
        onActionClick={openCreateForm}
      />

      <div className="admin-card mb-4 flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => {
            setGenerateMessage(null);
            generateMutation.mutate();
          }}
          className="admin-btn-secondary"
        >
          {generateMutation.isPending ? "Generating..." : "Generate system alerts"}
        </button>
        {generateMessage ? (
          <p className="text-sm text-gray-600">{generateMessage}</p>
        ) : null}
      </div>

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="System alerts will appear here."
          actionLabel="Create alert"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-[#fafbfc]">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const reservationId = getAlertReservationId(alert);
                const contactMessageId = getAlertContactMessageId(alert);
                const isReservationAlert = alert.alert_type.slug === "reservation_follow_up";
                const isContactAlert = alert.alert_type.slug === "website_contact";
                const canOpenReservation = isReservationAlert && reservationId !== null;
                const canOpenContact = isContactAlert && contactMessageId !== null;
                const canOpen = canOpenReservation || canOpenContact;

                return (
                  <tr
                    key={alert.id}
                    className={canOpen ? "cursor-pointer" : undefined}
                    onClick={() => {
                      if (canOpenReservation) {
                        openReservation(alert);
                      } else if (canOpenContact) {
                        openContactMessage(alert);
                      }
                    }}
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{alert.title}</div>
                      {alert.message ? (
                        <div className="mt-1 text-xs text-gray-500">{alert.message}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        label={alert.alert_type.name}
                        className={getAlertTypeBadgeClass(alert.alert_type.slug)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        label={alert.alert_status.name}
                        className={getAlertStatusBadgeClass(alert.alert_status.slug)}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDateTime(alert.created_at)}</td>
                    <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-3">
                        {canOpenReservation ? (
                          <Link
                            href={`/reservations/${reservationId}`}
                            className="font-semibold text-[#3563E9] hover:underline"
                          >
                            Open
                          </Link>
                        ) : null}
                        {canOpenContact ? (
                          <Link
                            href={`/contact-messages?message=${contactMessageId}`}
                            className="font-semibold text-[#3563E9] hover:underline"
                          >
                            Open
                          </Link>
                        ) : null}
                        {alert.alert_status.slug === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="font-semibold text-green-700 hover:underline"
                              onClick={() => actionMutation.mutate({ id: alert.id, action: "done" })}
                            >
                              Done
                            </button>
                            <button
                              type="button"
                              className="text-gray-500 hover:underline"
                              onClick={() => actionMutation.mutate({ id: alert.id, action: "ignore" })}
                            >
                              Ignore
                            </button>
                          </>
                        ) : !canOpen ? (
                          <span className="text-sm text-gray-400">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
          </div>
        </div>
      )}

      <AdminCollapsibleFormCard open={showForm} title="Create alert" formRef={formRef}>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {submitError ? <div className="md:col-span-2"><ErrorMessage message={submitError} /></div> : null}
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
          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending} className="admin-btn-primary">
              {createMutation.isPending ? "Creating..." : "Create alert"}
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
