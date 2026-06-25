"use client";

import { FormEvent, useRef, useState, type ChangeEvent } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { AdminImageThumb } from "@/components/ui/AdminImageThumb";
import {
  AdminCollapsibleFormCard,
  AdminFormField,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
  scrollToAdminForm,
} from "@/components/ui/AdminUi";
import {
  createVehicleBrand,
  deleteVehicleBrand,
  deleteVehicleBrandImage,
  getVehicleBrands,
  updateVehicleBrand,
  uploadVehicleBrandImage,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { slugify } from "@/lib/format";
import { storageUrl } from "@/lib/images";
import { queryKeys } from "@/lib/query/keys";
import type { VehicleBrand } from "@/types/api";

export default function VehicleBrandsPage() {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingBrand, setEditingBrand] = useState<VehicleBrand | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: queryKeys.vehicleBrands(page),
    queryFn: () => getVehicleBrands(page),
    placeholderData: keepPreviousData,
  });

  const invalidateBrands = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicle-brands"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.lookups });
  };

  const saveMutation = useLockedMutation({
    mutationFn: async (payload: { name: string; slug: string; is_active: boolean; id?: number }) => {
      const response = payload.id
        ? await updateVehicleBrand(payload.id, payload)
        : await createVehicleBrand(payload);

      if (logoFile) {
        await uploadVehicleBrandImage(response.data.id, logoFile);
      }

      return response;
    },
    onSuccess: () => {
      invalidateBrands();
      resetForm();
    },
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteVehicleBrand,
    onSuccess: invalidateBrands,
  });

  const deleteImageMutation = useLockedMutation({
    mutationFn: deleteVehicleBrandImage,
    onSuccess: () => {
      invalidateBrands();
      if (editingBrand) {
        setEditingBrand({ ...editingBrand, image_path: null });
        setLogoPreview(null);
      }
    },
  });

  const brands = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;
  const slugPreview = slugify(name);

  const resetForm = () => {
    setName("");
    setIsActive(true);
    setEditingId(null);
    setEditingBrand(null);
    setLogoFile(null);
    setLogoPreview(null);
    setShowForm(false);
    setSubmitError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
    scrollToAdminForm(formRef);
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(
      file
        ? URL.createObjectURL(file)
        : editingBrand?.image_path
          ? storageUrl(editingBrand.image_path)
          : null,
    );
  };

  const startEdit = (brand: VehicleBrand) => {
    setEditingId(brand.id);
    setEditingBrand(brand);
    setName(brand.name);
    setIsActive(brand.is_active);
    setLogoFile(null);
    setLogoPreview(brand.image_path ? storageUrl(brand.image_path) : null);
    setShowForm(true);
    setSubmitError(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    scrollToAdminForm(formRef);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await saveMutation.mutateAsync({
        name,
        slug: slugPreview,
        is_active: isActive,
        ...(editingId ? { id: editingId } : {}),
      });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Save failed.");
    }
  };

  const loadError =
    error instanceof ApiError ? error.message : error ? "Failed to load brands." : null;

  const previewSrc =
    logoPreview ?? (editingBrand?.image_path ? storageUrl(editingBrand.image_path) : null);

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage vehicle manufacturers. Add a brand before creating vehicles."
        actionLabel="Add brand"
        onActionClick={openCreateForm}
      />

      {loadError ? <div className="mb-4"><ErrorMessage message={loadError} /></div> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading brands...</div>
      ) : brands.length === 0 ? (
        <EmptyState
          title="No brands yet"
          description="Start by adding your first vehicle brand. You need at least one brand before creating vehicles."
          actionLabel="Add your first brand"
          onAction={openCreateForm}
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{brands.length} brand{brands.length === 1 ? "" : "s"}</p>
          </div>
          <table className="admin-table w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left">Logo</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <AdminImageThumb
                      src={brand.image_path ? storageUrl(brand.image_path) : null}
                      alt={brand.name}
                      size="xl"
                      fit="contain"
                      emptyLabel="No logo"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{brand.name}</td>
                  <td className="px-4 py-3 text-gray-500">{brand.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        brand.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {brand.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#3563E9] hover:underline"
                        onClick={() => startEdit(brand)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-sm font-semibold text-red-500 hover:underline"
                        onClick={async () => {
                          if (!confirm(`Delete ${brand.name}?`)) return;
                          await deleteMutation.mutateAsync(brand.id);
                          if (editingId === brand.id) resetForm();
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
        title={editingId ? "Edit brand" : "Add brand"}
        formRef={formRef}
      >
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
          {submitError ? <ErrorMessage message={submitError} /> : null}
          <AdminFormField label="Brand name" hint="Example: Toyota, BMW, Mercedes.">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter brand name"
              className="admin-input"
              required
            />
          </AdminFormField>

          <label className="group block max-w-sm cursor-pointer">
            <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-[8px] border border-dashed border-gray-200 bg-gray-50 p-3 transition-colors group-hover:border-[#3563E9] group-hover:bg-blue-50/40">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewSrc}
                  alt={name || "Brand logo preview"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Upload logo</p>
                  <p className="mt-1 text-xs text-gray-400">PNG, JPG, or WEBP</p>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {logoFile ? logoFile.name : "Click the box above to choose a logo"}
            </p>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="sr-only"
            />
          </label>

          {name ? (
            <AdminFormField label="URL slug" hint="Generated automatically from the brand name.">
              <input value={slugPreview} readOnly className="admin-input bg-gray-50 text-gray-500" />
            </AdminFormField>
          ) : null}

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
              {saveMutation.isPending ? "Saving..." : editingId ? "Save changes" : "Create brand"}
            </button>
            {editingId && editingBrand?.image_path ? (
              <button
                type="button"
                className="admin-btn-secondary text-red-500"
                onClick={() => deleteImageMutation.mutate(editingBrand.id)}
              >
                Remove logo
              </button>
            ) : null}
            <button type="button" className="admin-btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      </AdminCollapsibleFormCard>
    </div>
  );
}
