"use client";

import { FormEvent, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { slugify } from "@/lib/format";
import { useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Location } from "@/types/api";
import {
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
} from "@/components/ui/AdminUi";

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    location_type_slug: "agency",
    name: "",
    slug: "",
    address: "",
    delivery_fee: "0",
    is_active: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: lookups } = useLookupsQuery();

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.locations(page),
    queryFn: () => getLocations(page),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useLockedMutation({
    mutationFn: (payload: Parameters<typeof createLocation>[0] & { id?: number }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateLocation(id, body);
      }
      return createLocation(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });

  const locations = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const resetForm = () => {
    setEditingId(null);
    setForm({
      location_type_slug: "agency",
      name: "",
      slug: "",
      address: "",
      delivery_fee: "0",
      is_active: true,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      location_type_slug: form.location_type_slug,
      name: form.name,
      slug: form.slug || slugify(form.name),
      address: form.address || null,
      delivery_fee: Number(form.delivery_fee),
      is_active: form.is_active,
      ...(editingId ? { id: editingId } : {}),
    };

    try {
      await saveMutation.mutateAsync(payload);
      resetForm();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      setSubmitError(
        isValidationError(body)
          ? body.message
          : err instanceof ApiError
            ? err.message
            : "Save failed.",
      );
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load locations." : null;

  return (
    <div>
      <PageHeader title="Locations" description="Agency and pickup locations for your fleet." />

      <form onSubmit={handleSubmit} className="admin-card mb-6 space-y-4 p-6">
        <h2 className="text-lg font-bold text-gray-900">
          {editingId ? "Edit location" : "Add location"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
                slug: editingId ? current.slug : slugify(event.target.value),
              }))
            }
            className="admin-input"
            required
          />
          <input
            placeholder="Slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            className="admin-input"
            required
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            className="admin-input"
          />
          <input
            placeholder="Delivery fee"
            type="number"
            value={form.delivery_fee}
            onChange={(event) => setForm((current) => ({ ...current, delivery_fee: event.target.value }))}
            className="admin-input"
          />
          <select
            value={form.location_type_slug}
            onChange={(event) =>
              setForm((current) => ({ ...current, location_type_slug: event.target.value }))
            }
            className="admin-input"
          >
            {lookups?.location_types.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
            {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Create"}
          </button>
          {editingId ? (
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {submitError ? <ErrorMessage message={submitError} /> : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : locations.length === 0 ? (
        <EmptyState title="No locations" description="Add a location where vehicles are based." />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location: Location) => (
                <tr key={location.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{location.name}</div>
                    <div className="text-xs text-gray-400">{location.address}</div>
                  </td>
                  <td className="px-4 py-3">{location.location_type.name}</td>
                  <td className="px-4 py-3">{location.delivery_fee}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline"
                        onClick={() => {
                          setEditingId(location.id);
                          setForm({
                            location_type_slug: location.location_type.slug,
                            name: location.name,
                            slug: location.slug,
                            address: location.address ?? "",
                            delivery_fee: location.delivery_fee,
                            is_active: location.is_active,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete location?")) return;
                          await deleteMutation.mutateAsync(location.id);
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
