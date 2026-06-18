"use client";

import { FormEvent, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AdminFormField,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
} from "@/components/ui/AdminUi";
import {
  createVehicleCategory,
  deleteVehicleCategory,
  getVehicleCategories,
  updateVehicleCategory,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { slugify } from "@/lib/format";
import { queryKeys } from "@/lib/query/keys";
import type { VehicleCategory } from "@/types/api";

export default function VehicleCategoriesPage() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.vehicleCategories(page),
    queryFn: () => getVehicleCategories(page),
    placeholderData: keepPreviousData,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      slug: string;
      description?: string | null;
      is_active: boolean;
      id?: number;
    }) => {
      if (payload.id) {
        const { id, ...body } = payload;
        return updateVehicleCategory(id, body);
      }
      return createVehicleCategory(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lookups });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicleCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-categories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lookups });
    },
  });

  const categories = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const slugPreview = slugify(name);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsActive(true);
    setEditingId(null);
    setShowForm(false);
    setSubmitError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const startEdit = (category: VehicleCategory) => {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description ?? "");
    setIsActive(category.is_active);
    setShowForm(true);
    setSubmitError(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await saveMutation.mutateAsync({
        name,
        slug: slugPreview,
        description: description || null,
        is_active: isActive,
        ...(editingId ? { id: editingId } : {}),
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load categories." : null;

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group vehicles by type, such as Economy, SUV, or Luxury."
        actionLabel="Add category"
        onActionClick={openCreateForm}
      />

      {showForm ? (
        <div ref={formRef} className="admin-card mb-6 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit category" : "New category"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {editingId
                  ? "Update the category details shown when creating vehicles."
                  : "Create a category to organize your fleet."}
              </p>
            </div>
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              Close
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField label="Category name" hint="Example: Economy, SUV, Luxury.">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter category name"
                  className="admin-input"
                  required
                />
              </AdminFormField>

              {name ? (
                <AdminFormField label="URL slug" hint="Generated automatically from the category name.">
                  <input value={slugPreview} readOnly className="admin-input bg-gray-50 text-gray-500" />
                </AdminFormField>
              ) : null}
            </div>

            <AdminFormField label="Description" hint="Optional. Shown internally to help your team choose the right category.">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description of this category"
                className="admin-input min-h-24"
              />
            </AdminFormField>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Active on the site
            </label>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
              <button type="submit" disabled={saveMutation.isPending} className="admin-btn-primary">
                {saveMutation.isPending ? "Saving..." : editingId ? "Save changes" : "Create category"}
              </button>
              <button type="button" className="admin-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {submitError ? <div className="mb-4"><ErrorMessage message={submitError} /></div> : null}
      {loadError ? <div className="mb-4"><ErrorMessage message={loadError} /></div> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading categories...</div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create categories to organize your fleet. You need at least one category before adding vehicles."
          actionLabel="Add your first category"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{category.name}</td>
                  <td className="px-4 py-3 text-gray-500">{category.slug}</td>
                  <td className="max-w-xs px-4 py-3 text-sm text-gray-500">
                    {category.description || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        category.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#3563E9] hover:underline"
                        onClick={() => startEdit(category)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm(`Delete ${category.name}?`)) return;
                          await deleteMutation.mutateAsync(category.id);
                          if (editingId === category.id) resetForm();
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
