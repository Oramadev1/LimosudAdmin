"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { RentalPeriodFields } from "@/components/reservations/RentalPeriodFields";
import {
  checkReservationAvailability,
  createReservation,
  getCustomers,
  getLocations,
  getVehicleAvailabilitySchedule,
  getVehicles,
} from "@/lib/api/admin";
import { toApiDatetime } from "@/lib/format";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAdminQuery } from "@/lib/query/hooks";
import {
  AdminFormField,
  FormGlobalError,
  inputErrorClass,
  PageHeader,
} from "@/components/ui/AdminUi";
import type { ReservationAvailabilityResult } from "@/types/api";

export default function NewReservationPage() {
  const router = useRouter();
  const [availability, setAvailability] = useState<ReservationAvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError, setGlobalError } =
    useAdminFormErrors();
  const [form, setForm] = useState({
    customer_id: "",
    vehicle_id: "",
    pickup_location_id: "",
    dropoff_location_id: "",
    start_datetime: "",
    end_datetime: "",
    customer_notes: "",
    admin_notes: "",
  });

  const vehicleId = form.vehicle_id ? Number(form.vehicle_id) : null;
  const hasValidDates =
    Boolean(form.start_datetime && form.end_datetime) &&
    new Date(form.end_datetime) > new Date(form.start_datetime);

  const { data: customers } = useAdminQuery({ queryKey: ["customers", 1], queryFn: () => getCustomers(1) });
  const { data: vehicles } = useAdminQuery({ queryKey: ["vehicles", 1], queryFn: () => getVehicles(1) });
  const { data: locations } = useAdminQuery({ queryKey: ["locations", 1], queryFn: () => getLocations(1) });
  const { data: vehicleSchedule } = useAdminQuery({
    queryKey: ["vehicle-availability-schedule", vehicleId],
    queryFn: () => getVehicleAvailabilitySchedule(vehicleId!),
    enabled: vehicleId !== null,
  });

  const createMutation = useLockedMutation({
    mutationFn: createReservation,
    onSuccess: (response) => router.push(`/reservations/${response.data.id}`),
  });
  const { runOnce, busy } = useSubmitLock();

  useEffect(() => {
    if (!vehicleId || !hasValidDates) {
      setAvailability(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setCheckingAvailability(true);

      try {
        const result = await checkReservationAvailability({
          vehicle_id: vehicleId,
          start_datetime: toApiDatetime(form.start_datetime),
          end_datetime: toApiDatetime(form.end_datetime),
        });
        setAvailability(result);
      } catch {
        setAvailability(null);
      } finally {
        setCheckingAvailability(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [vehicleId, hasValidDates, form.start_datetime, form.end_datetime]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    await runOnce(async () => {
      resetErrors();

      const startDatetime = toApiDatetime(form.start_datetime);
      const endDatetime = toApiDatetime(form.end_datetime);

      try {
        const availabilityResult =
          availability ??
          (await checkReservationAvailability({
            vehicle_id: Number(form.vehicle_id),
            start_datetime: startDatetime,
            end_datetime: endDatetime,
          }));

        if (!availabilityResult.available) {
          setAvailability(availabilityResult);
          setGlobalError("The selected period is not available. Choose open dates on the calendar.");
          return;
        }

        await createMutation.mutateAsync({
          customer_id: Number(form.customer_id),
          vehicle_id: Number(form.vehicle_id),
          pickup_location_id: Number(form.pickup_location_id),
          dropoff_location_id: Number(form.dropoff_location_id),
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          customer_notes: form.customer_notes || null,
          admin_notes: form.admin_notes || null,
        });
      } catch (err) {
        applySubmissionError(err, "Create failed.");
      }
    });
  };

  const blockedPeriods = vehicleSchedule?.blocked_periods ?? [];
  const vehicleRentable = vehicleSchedule?.vehicle_rentable ?? false;

  return (
    <div>
      <PageHeader
        title="New reservation"
        description="Select a vehicle, then pick open dates on the calendar. Booked dates are disabled."
      />

      <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6">
        <FormGlobalError message={globalError} />

        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField error={fieldErrors.customer_id}>
            <select
              value={form.customer_id}
              onChange={(e) => {
                setForm((c) => ({ ...c, customer_id: e.target.value }));
                clearFieldError("customer_id");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.customer_id)}`}
              required
            >
              <option value="">Select customer</option>
              {customers?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField error={fieldErrors.vehicle_id}>
            <select
              value={form.vehicle_id}
              onChange={(e) => {
                setForm((c) => ({
                  ...c,
                  vehicle_id: e.target.value,
                  start_datetime: "",
                  end_datetime: "",
                }));
                setAvailability(null);
                clearFieldError("vehicle_id");
                resetErrors();
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.vehicle_id)}`}
              required
            >
              <option value="">Select vehicle</option>
              {vehicles?.data.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField error={fieldErrors.pickup_location_id}>
            <select
              value={form.pickup_location_id}
              onChange={(e) => {
                setForm((c) => ({ ...c, pickup_location_id: e.target.value }));
                clearFieldError("pickup_location_id");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.pickup_location_id)}`}
              required
            >
              <option value="">Pickup location</option>
              {locations?.data.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField error={fieldErrors.dropoff_location_id}>
            <select
              value={form.dropoff_location_id}
              onChange={(e) => {
                setForm((c) => ({ ...c, dropoff_location_id: e.target.value }));
                clearFieldError("dropoff_location_id");
              }}
              className={`admin-input ${inputErrorClass(fieldErrors.dropoff_location_id)}`}
              required
            >
              <option value="">Drop-off location</option>
              {locations?.data.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </AdminFormField>

          {vehicleId ? (
            <RentalPeriodFields
              startValue={form.start_datetime}
              endValue={form.end_datetime}
              blockedPeriods={blockedPeriods}
              vehicleRentable={vehicleRentable}
              onStartChange={(start_datetime) => {
                setForm((current) => ({ ...current, start_datetime }));
                clearFieldError("start_datetime");
                setGlobalError(null);
              }}
              onEndChange={(end_datetime) => {
                setForm((current) => ({ ...current, end_datetime }));
                clearFieldError("end_datetime");
                setGlobalError(null);
              }}
            />
          ) : (
            <div className="md:col-span-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Select a vehicle to open the calendar and choose rental dates.
            </div>
          )}
        </div>

        {vehicleId && hasValidDates ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm">
            {checkingAvailability ? (
              <span className="text-gray-500">Checking availability...</span>
            ) : availability?.available ? (
              <span className="font-medium text-green-700">This period is available.</span>
            ) : availability ? (
              <span className="font-medium text-red-700">
                This period overlaps a booking. Choose different dates on the calendar.
              </span>
            ) : null}
          </div>
        ) : null}

        <AdminFormField error={fieldErrors.customer_notes}>
          <textarea
            placeholder="Customer notes"
            value={form.customer_notes}
            onChange={(e) => {
              setForm((c) => ({ ...c, customer_notes: e.target.value }));
              clearFieldError("customer_notes");
            }}
            className={`admin-input min-h-20 ${inputErrorClass(fieldErrors.customer_notes)}`}
          />
        </AdminFormField>
        <AdminFormField error={fieldErrors.admin_notes}>
          <textarea
            placeholder="Admin notes"
            value={form.admin_notes}
            onChange={(e) => {
              setForm((c) => ({ ...c, admin_notes: e.target.value }));
              clearFieldError("admin_notes");
            }}
            className={`admin-input min-h-20 ${inputErrorClass(fieldErrors.admin_notes)}`}
          />
        </AdminFormField>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy || createMutation.isPending} className="admin-btn-primary">
            {busy || createMutation.isPending ? "Creating..." : "Create reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}
