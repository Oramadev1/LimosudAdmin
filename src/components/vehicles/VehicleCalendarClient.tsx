"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  checkReservationAvailability,
  createVehicleAvailabilityHold,
  deleteVehicleAvailabilityHold,
  getVehicle,
  getVehicleAvailabilityHolds,
  getVehicleSchedule,
  updateVehicleAvailabilityHold,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatDateTime, toApiDatetime, toInputDatetime } from "@/lib/format";
import { INPUT_LIMITS } from "@/lib/input-limits";
import { useAdminQuery } from "@/lib/query/hooks";
import { useLockedMutation } from "@/lib/use-locked-mutation";
import { useSubmitLock } from "@/lib/use-submit-lock";
import {
  AdminFormField,
  ErrorMessage,
  FormGlobalError,
  PageHeader,
} from "@/components/ui/AdminUi";
import { RentalDatetimeFields, hasValidRentalDatetimeRange } from "@/components/reservations/RentalDatetimeFields";
import type { BlockedReservationPeriod, ReservationAvailabilityResult, VehicleAvailabilityHold } from "@/types/api";

type VehicleCalendarClientProps = {
  vehicleId: number;
};

function toDateYmd(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function scheduleRangeForMonth(viewMonth: Date): { from: string; to: string } {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month + 2, 0);

  return { from: toDateYmd(from), to: toDateYmd(to) };
}

function buildMonthGrid(viewMonth: Date): Array<Date | null> {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function dayOverlaps(dateYmd: string, period: BlockedReservationPeriod): boolean {
  const day = new Date(`${dateYmd}T12:00:00`).getTime();
  const start = new Date(`${period.start_datetime.slice(0, 10)}T00:00:00`).getTime();
  const end = new Date(`${period.end_datetime.slice(0, 10)}T23:59:59`).getTime();
  return day >= start && day <= end;
}

function dayBlockKinds(dateYmd: string, periods: BlockedReservationPeriod[]) {
  let hasReservation = false;
  let hasHold = false;

  for (const period of periods) {
    if (!dayOverlaps(dateYmd, period)) {
      continue;
    }

    if (period.type === "hold") {
      hasHold = true;
    } else {
      hasReservation = true;
    }
  }

  return { hasReservation, hasHold };
}

function dayCellClass(hasReservation: boolean, hasHold: boolean): string {
  if (hasReservation && hasHold) {
    return "bg-violet-100 font-semibold text-violet-900";
  }
  if (hasReservation) {
    return "bg-blue-100 font-semibold text-blue-900";
  }
  if (hasHold) {
    return "bg-amber-100 font-semibold text-amber-900";
  }
  return "bg-gray-50 text-gray-700";
}

function reservationSourceLabel(source?: string | null): string {
  if (source === "website") {
    return "Website";
  }
  if (source === "admin_manual") {
    return "Admin";
  }
  return "Reservation";
}

export function VehicleCalendarClient({ vehicleId }: VehicleCalendarClientProps) {
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    starts_at: "",
    ends_at: "",
    customer_name: "",
    phone: "",
    note: "",
  });
  const [editingHoldId, setEditingHoldId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    starts_at: "",
    ends_at: "",
    customer_name: "",
    phone: "",
    note: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [createAvailability, setCreateAvailability] = useState<ReservationAvailabilityResult | null>(null);
  const [editAvailability, setEditAvailability] = useState<ReservationAvailabilityResult | null>(null);
  const [checkingCreateAvailability, setCheckingCreateAvailability] = useState(false);
  const [checkingEditAvailability, setCheckingEditAvailability] = useState(false);
  const { runOnce, busy } = useSubmitLock();
  const { runOnce: runEditOnce, busy: editBusy } = useSubmitLock();

  const scheduleRange = useMemo(() => scheduleRangeForMonth(viewMonth), [viewMonth]);

  const { data: vehicleResponse, error: vehicleError } = useAdminQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => getVehicle(vehicleId),
  });

  const {
    data: schedule,
    error: scheduleError,
    isPending: schedulePending,
  } = useAdminQuery({
    queryKey: ["vehicle-schedule", vehicleId, scheduleRange.from, scheduleRange.to],
    queryFn: () => getVehicleSchedule(vehicleId, scheduleRange),
  });

  const {
    data: holdsResponse,
    error: holdsError,
    isPending: holdsPending,
  } = useAdminQuery({
    queryKey: ["vehicle-availability-holds", vehicleId],
    queryFn: () => getVehicleAvailabilityHolds(vehicleId),
  });

  const createMutation = useLockedMutation({
    mutationFn: () =>
      createVehicleAvailabilityHold(vehicleId, {
        starts_at: toApiDatetime(form.starts_at),
        ends_at: toApiDatetime(form.ends_at),
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim() || null,
        note: form.note.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-schedule", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-availability-holds", vehicleId] });
      setForm({ starts_at: "", ends_at: "", customer_name: "", phone: "", note: "" });
      setFormError(null);
      setCreateAvailability(null);
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: (holdId: number) => deleteVehicleAvailabilityHold(vehicleId, holdId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-schedule", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-availability-holds", vehicleId] });
      if (editingHoldId) {
        setEditingHoldId(null);
        setEditError(null);
      }
    },
  });

  const updateMutation = useLockedMutation({
    mutationFn: (payload: { holdId: number; data: Parameters<typeof updateVehicleAvailabilityHold>[2] }) =>
      updateVehicleAvailabilityHold(vehicleId, payload.holdId, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-schedule", vehicleId] });
      queryClient.invalidateQueries({ queryKey: ["vehicle-availability-holds", vehicleId] });
      setEditingHoldId(null);
      setEditError(null);
    },
  });

  const periods = schedule?.blocked_periods ?? [];
  const reservations = periods.filter((period) => period.type !== "hold");
  const holds = holdsResponse?.data ?? [];
  const monthLabel = viewMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const hasValidCreateDates = hasValidRentalDatetimeRange(form.starts_at, form.ends_at);

  const hasValidEditDates = hasValidRentalDatetimeRange(editForm.starts_at, editForm.ends_at);

  useEffect(() => {
    if (!hasValidCreateDates) {
      setCreateAvailability(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingCreateAvailability(true);
      try {
        const result = await checkReservationAvailability({
          vehicle_id: vehicleId,
          start_datetime: toApiDatetime(form.starts_at),
          end_datetime: toApiDatetime(form.ends_at),
        });
        setCreateAvailability(result);
      } catch {
        setCreateAvailability(null);
      } finally {
        setCheckingCreateAvailability(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [form.ends_at, form.starts_at, hasValidCreateDates, vehicleId]);

  useEffect(() => {
    if (editingHoldId === null || !hasValidEditDates) {
      setEditAvailability(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingEditAvailability(true);
      try {
        const result = await checkReservationAvailability({
          vehicle_id: vehicleId,
          start_datetime: toApiDatetime(editForm.starts_at),
          end_datetime: toApiDatetime(editForm.ends_at),
          ignore_hold_id: editingHoldId,
        });
        setEditAvailability(result);
      } catch {
        setEditAvailability(null);
      } finally {
        setCheckingEditAvailability(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    editForm.ends_at,
    editForm.starts_at,
    editingHoldId,
    hasValidEditDates,
    vehicleId,
  ]);

  const loadError =
    vehicleError instanceof ApiError
      ? vehicleError.message
      : scheduleError instanceof ApiError
        ? scheduleError.message
        : holdsError instanceof ApiError
          ? holdsError.message
          : null;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!form.starts_at || !form.ends_at || !form.customer_name.trim()) {
      setFormError("Start, end, and customer name are required.");
      return;
    }

    if (new Date(form.ends_at) <= new Date(form.starts_at)) {
      setFormError("End must be after start.");
      return;
    }

    if (!createAvailability?.available) {
      setFormError("The vehicle is not available for these dates.");
      return;
    }

    await runOnce(async () => {
      try {
        await createMutation.mutateAsync();
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : "Failed to create hold.");
      }
    });
  };

  const handleDelete = async (holdId: number) => {
    if (!confirm("Remove this calendar hold?")) return;
    try {
      await deleteMutation.mutateAsync(holdId);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete hold.");
    }
  };

  const startEditingHold = (hold: VehicleAvailabilityHold) => {
    setEditingHoldId(hold.id);
    setEditError(null);
    setEditAvailability(null);
    setEditForm({
      starts_at: toInputDatetime(hold.starts_at),
      ends_at: toInputDatetime(hold.ends_at),
      customer_name: hold.customer_name,
      phone: hold.phone ?? "",
      note: hold.note ?? "",
    });
  };

  const handleUpdateHold = async (event: FormEvent) => {
    event.preventDefault();
    if (editingHoldId === null) return;

    setEditError(null);

    if (!editForm.starts_at || !editForm.ends_at || !editForm.customer_name.trim()) {
      setEditError("Start, end, and customer name are required.");
      return;
    }

    if (new Date(editForm.ends_at) <= new Date(editForm.starts_at)) {
      setEditError("End must be after start.");
      return;
    }

    if (!editAvailability?.available) {
      setEditError("The vehicle is not available for these dates.");
      return;
    }

    await runEditOnce(async () => {
      try {
        await updateMutation.mutateAsync({
          holdId: editingHoldId,
          data: {
            starts_at: toApiDatetime(editForm.starts_at),
            ends_at: toApiDatetime(editForm.ends_at),
            customer_name: editForm.customer_name.trim(),
            phone: editForm.phone.trim() || null,
            note: editForm.note.trim() || null,
          },
        });
      } catch (err) {
        setEditError(err instanceof ApiError ? err.message : "Failed to update hold.");
      }
    });
  };

  const vehicle = vehicleResponse?.data;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <PageHeader
          title={vehicle ? `Calendar — ${vehicle.name}` : "Vehicle calendar"}
          description="Blue days are website or admin reservations. Amber days are phone holds. Both block online booking."
        />

        <div className="mb-4">
          <Link href="/vehicles" className="text-sm text-[#3563E9] hover:underline">
            ← Back to vehicles
          </Link>
        </div>

        {loadError ? <ErrorMessage message={loadError} /> : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:overflow-hidden">
        <div className="admin-card h-fit shrink-0 p-4 lg:w-[52%] lg:max-w-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
              }
            >
              Previous
            </button>
            <h2 className="text-sm font-semibold text-gray-900">{monthLabel}</h2>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() =>
                setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
              }
            >
              Next
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {schedulePending ? (
            <p className="text-sm text-gray-500">Loading calendar…</p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="h-10" />;
                }

                const ymd = toDateYmd(date);
                const { hasReservation, hasHold } = dayBlockKinds(ymd, periods);

                return (
                  <div
                    key={ymd}
                    className={`flex h-10 flex-col items-center justify-center rounded-md text-sm ${dayCellClass(
                      hasReservation,
                      hasHold,
                    )}`}
                    title={
                      hasReservation && hasHold
                        ? "Reservation + phone hold"
                        : hasReservation
                          ? "Reservation"
                          : hasHold
                            ? "Phone hold"
                            : "Available"
                    }
                  >
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-blue-100" /> Reservation
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded bg-amber-100" /> Phone hold
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain lg:max-h-full lg:pb-2 lg:pr-1">
          <div className="admin-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Reservations (website & admin)</h2>
            {schedulePending ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : reservations.length === 0 ? (
              <p className="text-sm text-gray-500">No reservations in this period.</p>
            ) : (
              <ul className="space-y-3">
                {reservations.map((period) => (
                  <li
                    key={`${period.reservation_id ?? period.reservation_number}-${period.start_datetime}`}
                    className="rounded-md border border-blue-100 bg-blue-50 p-3 text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {period.reservation_number ?? "Reservation"}
                      {period.customer_name ? ` — ${period.customer_name}` : ""}
                    </div>
                    <div className="text-gray-600">
                      {reservationSourceLabel(period.source)}
                      {period.status ? ` · ${period.status}` : ""}
                    </div>
                    <div className="text-gray-500">
                      {formatDateTime(period.start_datetime)} → {formatDateTime(period.end_datetime)}
                    </div>
                    {period.reservation_id ? (
                      <Link
                        href={`/reservations/${period.reservation_id}`}
                        className="mt-2 inline-block text-[#3563E9] hover:underline"
                      >
                        Open reservation
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleCreate} className="admin-card space-y-4 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Hold dates (phone booking)</h2>
            {formError ? <FormGlobalError message={formError} /> : null}

            <RentalDatetimeFields
              startValue={form.starts_at}
              endValue={form.ends_at}
              checking={checkingCreateAvailability}
              availability={createAvailability}
              onStartChange={(starts_at) => setForm((current) => ({ ...current, starts_at }))}
              onEndChange={(ends_at) => setForm((current) => ({ ...current, ends_at }))}
            />

            <AdminFormField label="Customer name">
              <input
                type="text"
                value={form.customer_name}
                maxLength={INPUT_LIMITS.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customer_name: event.target.value }))
                }
                className="admin-input"
                required
              />
            </AdminFormField>

            <AdminFormField label="Phone">
              <input
                type="text"
                value={form.phone}
                maxLength={INPUT_LIMITS.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="admin-input"
              />
            </AdminFormField>

            <AdminFormField label="Note">
              <textarea
                value={form.note}
                maxLength={INPUT_LIMITS.notes}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                className="admin-input min-h-20"
              />
            </AdminFormField>

            <button
              type="submit"
              className="admin-btn-primary"
              disabled={busy || checkingCreateAvailability || !createAvailability?.available}
            >
              {busy ? "Saving…" : "Save hold"}
            </button>
          </form>

          <div className="admin-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Phone holds</h2>
            {holdsPending ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : holds.length === 0 ? (
              <p className="text-sm text-gray-500">No phone holds yet.</p>
            ) : (
              <ul className="space-y-3">
                {holds.map((hold) => (
                  <li key={hold.id} className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm">
                    {editingHoldId === hold.id ? (
                      <form onSubmit={handleUpdateHold} className="space-y-3">
                        {editError ? <FormGlobalError message={editError} /> : null}
                        <RentalDatetimeFields
                          startValue={editForm.starts_at}
                          endValue={editForm.ends_at}
                          checking={checkingEditAvailability}
                          availability={editAvailability}
                          onStartChange={(starts_at) =>
                            setEditForm((current) => ({ ...current, starts_at }))
                          }
                          onEndChange={(ends_at) =>
                            setEditForm((current) => ({ ...current, ends_at }))
                          }
                        />
                        <AdminFormField label="Customer name">
                          <input
                            type="text"
                            value={editForm.customer_name}
                            maxLength={INPUT_LIMITS.name}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, customer_name: event.target.value }))
                            }
                            className="admin-input"
                            required
                          />
                        </AdminFormField>
                        <AdminFormField label="Phone">
                          <input
                            type="text"
                            value={editForm.phone}
                            maxLength={INPUT_LIMITS.phone}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, phone: event.target.value }))
                            }
                            className="admin-input"
                          />
                        </AdminFormField>
                        <AdminFormField label="Note">
                          <textarea
                            value={editForm.note}
                            maxLength={INPUT_LIMITS.notes}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, note: event.target.value }))
                            }
                            className="admin-input min-h-20"
                          />
                        </AdminFormField>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="admin-btn-primary"
                            disabled={editBusy || checkingEditAvailability || !editAvailability?.available}
                          >
                            {editBusy ? "Saving…" : "Save changes"}
                          </button>
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            onClick={() => {
                              setEditingHoldId(null);
                              setEditError(null);
                              setEditAvailability(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900">{hold.customer_name}</div>
                        <div className="text-gray-500">
                          {formatDateTime(hold.starts_at)} → {formatDateTime(hold.ends_at)}
                        </div>
                        {hold.phone ? <div className="text-gray-500">{hold.phone}</div> : null}
                        {hold.note ? <div className="mt-1 text-gray-600">{hold.note}</div> : null}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="text-[#3563E9] hover:underline"
                            onClick={() => startEditingHold(hold)}
                          >
                            Edit dates
                          </button>
                          <button
                            type="button"
                            className="text-red-500 hover:underline"
                            onClick={() => handleDelete(hold.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
