"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  checkReservationAvailability,
  createReservation,
  getCustomers,
  getLocations,
  getVehicles,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { ErrorMessage, PageHeader } from "@/components/ui/AdminUi";

export default function NewReservationPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<boolean | null>(null);
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

  const { data: customers } = useQuery({ queryKey: ["customers", 1], queryFn: () => getCustomers(1) });
  const { data: vehicles } = useQuery({ queryKey: ["vehicles", 1], queryFn: () => getVehicles(1) });
  const { data: locations } = useQuery({ queryKey: ["locations", 1], queryFn: () => getLocations(1) });

  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: (response) => router.push(`/reservations/${response.data.id}`),
  });

  const checkAvailability = async () => {
    if (!form.vehicle_id || !form.start_datetime || !form.end_datetime) return;
    try {
      const result = await checkReservationAvailability({
        vehicle_id: Number(form.vehicle_id),
        start_datetime: form.start_datetime.replace("T", " ") + ":00",
        end_datetime: form.end_datetime.replace("T", " ") + ":00",
      });
      setAvailability(result.available);
    } catch {
      setAvailability(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createMutation.mutateAsync({
        customer_id: Number(form.customer_id),
        vehicle_id: Number(form.vehicle_id),
        pickup_location_id: Number(form.pickup_location_id),
        dropoff_location_id: Number(form.dropoff_location_id),
        start_datetime: form.start_datetime.replace("T", " ") + ":00",
        end_datetime: form.end_datetime.replace("T", " ") + ":00",
        customer_notes: form.customer_notes || null,
        admin_notes: form.admin_notes || null,
      });
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setError(
        isValidationError(body) ? body.message : err instanceof ApiError ? err.message : "Create failed.",
      );
    }
  };

  return (
    <div>
      <PageHeader title="New reservation" description="Create a manual admin reservation." />

      <form onSubmit={handleSubmit} className="admin-card space-y-4 p-6">
        {error ? <ErrorMessage message={error} /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={form.customer_id}
            onChange={(e) => setForm((c) => ({ ...c, customer_id: e.target.value }))}
            className="admin-input"
            required
          >
            <option value="">Select customer</option>
            {customers?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
          <select
            value={form.vehicle_id}
            onChange={(e) => setForm((c) => ({ ...c, vehicle_id: e.target.value }))}
            className="admin-input"
            required
          >
            <option value="">Select vehicle</option>
            {vehicles?.data.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select
            value={form.pickup_location_id}
            onChange={(e) => setForm((c) => ({ ...c, pickup_location_id: e.target.value }))}
            className="admin-input"
            required
          >
            <option value="">Pickup location</option>
            {locations?.data.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            value={form.dropoff_location_id}
            onChange={(e) => setForm((c) => ({ ...c, dropoff_location_id: e.target.value }))}
            className="admin-input"
            required
          >
            <option value="">Drop-off location</option>
            {locations?.data.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.start_datetime}
            onChange={(e) => setForm((c) => ({ ...c, start_datetime: e.target.value }))}
            className="admin-input"
            required
          />
          <input
            type="datetime-local"
            value={form.end_datetime}
            onChange={(e) => setForm((c) => ({ ...c, end_datetime: e.target.value }))}
            className="admin-input"
            required
          />
        </div>

        <textarea
          placeholder="Customer notes"
          value={form.customer_notes}
          onChange={(e) => setForm((c) => ({ ...c, customer_notes: e.target.value }))}
          className="admin-input min-h-20"
        />
        <textarea
          placeholder="Admin notes"
          value={form.admin_notes}
          onChange={(e) => setForm((c) => ({ ...c, admin_notes: e.target.value }))}
          className="admin-input min-h-20"
        />

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={checkAvailability} className="admin-btn-secondary">
            Check availability
          </button>
          {availability !== null ? (
            <span className={`self-center text-sm ${availability ? "text-green-600" : "text-red-600"}`}>
              {availability ? "Available" : "Not available"}
            </span>
          ) : null}
          <button type="submit" disabled={createMutation.isPending} className="admin-btn-primary">
            {createMutation.isPending ? "Creating..." : "Create reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}
