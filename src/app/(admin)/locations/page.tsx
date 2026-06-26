"use client";

import { FormEvent, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { slugify } from "@/lib/format";
import { usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Location } from "@/types/api";
import {
  AdminCollapsibleFormCard,
  AdminFormField,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
  scrollToAdminForm,
} from "@/components/ui/AdminUi";

const emptyForm = {
  name: "",
  slug: "",
  address: "",
  delivery_fee: "0",
  is_active: true,
};

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.locations(page),
    () => getLocations(page),
  );

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
      resetForm();
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
    setForm(emptyForm);
    setShowForm(false);
    setSubmitError(null);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSubmitError(null);
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setForm({
      name: location.name,
      slug: location.slug,
      address: location.address ?? "",
      delivery_fee: location.delivery_fee,
      is_active: location.is_active,
    });
    setSubmitError(null);
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const payload = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      address: form.address || null,
      delivery_fee: Number(form.delivery_fee),
      is_active: form.is_active,
      ...(editingId
        ? { id: editingId }
        : { location_type_slug: "agency" as const }),
    } as Parameters<typeof createLocation>[0] & { id?: number };

    try {
      await saveMutation.mutateAsync(payload);
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
      <PageHeader
        title="Locations"
        description="Agency and pickup locations for your fleet."
        actionLabel="Add location"
        onActionClick={openCreateForm}
      />

      {loadError ? <ErrorMessage message={loadError} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading...</div>
      ) : locations.length === 0 ? (
        <EmptyState
          title="No locations"
          description="Add a location where vehicles are based."
          actionLabel="Add location"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Delivery fee</th>
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
                  <td className="px-4 py-3">{location.delivery_fee}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#3563E9] hover:underline"
                        onClick={() => startEdit(location)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm("Delete location?")) return;
                          await deleteMutation.mutateAsync(location.id);
                          if (editingId === location.id) resetForm();
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
        title={editingId ? "Edit location" : "Add location"}
        formRef={formRef}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError ? <ErrorMessage message={submitError} /> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Name">
              <input
                placeholder="e.g. Dakhla Airport"
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
            </AdminFormField>
            <AdminFormField label="Slug" hint="Used in URLs. Auto-filled from the name.">
              <input
                placeholder="dakhla-airport"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                className="admin-input"
                required
              />
            </AdminFormField>
            <AdminFormField label="Address">
              <input
                placeholder="Street, city"
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                className="admin-input"
              />
            </AdminFormField>
            <AdminFormField label="Delivery fee (MAD)" hint="Extra charge when this location is used for pick-up or drop-off.">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.delivery_fee}
                onChange={(event) => setForm((current) => ({ ...current, delivery_fee: event.target.value }))}
                className="admin-input"
              />
            </AdminFormField>
          </div>
          <div className="flex gap-3">
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
