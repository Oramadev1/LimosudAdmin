"use client";

import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import {
  createVehicle,
  getVehicle,
  updateVehicle,
  uploadVehiclePhotos,
} from "@/lib/api/admin";
import { ApiError, isValidationError } from "@/lib/api/client";
import { slugify } from "@/lib/format";
import { storageUrl } from "@/lib/images";
import { useLookupsQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { CreateVehiclePayload } from "@/types/api";
import { AdminFormField, ErrorMessage } from "@/components/ui/AdminUi";
import { AdminImageThumb } from "@/components/ui/AdminImageThumb";
import { VehiclePhotoManager } from "@/components/vehicles/VehiclePhotoManager";

type VehicleFormProps = {
  vehicleId?: number;
};

const defaultForm = {
  brand_id: "",
  category_id: "",
  status_slug: "available",
  transmission_type_slug: "manual",
  fuel_type_slug: "diesel",
  name: "",
  slug: "",
  model: "",
  year: String(new Date().getFullYear()),
  plate_number: "",
  mileage: "0",
  seats: "5",
  doors: "4",
  daily_price: "",
  weekly_price: "",
  monthly_price: "",
  deposit_amount: "",
  description: "",
  is_featured: false,
  is_active: true,
};

const STEP_LABELS = ["Vehicle details", "Photos & settings"] as const;

export function VehicleForm({ vehicleId }: VehicleFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(defaultForm);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: lookups, error: lookupsError } = useLookupsQuery();

  const {
    data: vehicleResponse,
    isPending: vehicleLoading,
    error: vehicleError,
  } = useQuery({
    queryKey: queryKeys.vehicle(vehicleId ?? 0),
    queryFn: () => getVehicle(vehicleId!),
    enabled: Boolean(vehicleId),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateVehiclePayload) => updateVehicle(vehicleId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(vehicleId!) });
    },
  });

  useEffect(() => {
    const data = vehicleResponse?.data;
    if (!data) return;

    setForm({
      brand_id: String(data.brand.id),
      category_id: String(data.category.id),
      status_slug: data.status.slug,
      transmission_type_slug: data.transmission_type.slug,
      fuel_type_slug: data.fuel_type.slug,
      name: data.name,
      slug: data.slug,
      model: data.model,
      year: String(data.year),
      plate_number: data.plate_number,
      mileage: String(data.mileage),
      seats: String(data.seats),
      doors: String(data.doors),
      daily_price: data.daily_price,
      weekly_price: data.weekly_price ?? "",
      monthly_price: data.monthly_price ?? "",
      deposit_amount: data.deposit_amount,
      description: data.description ?? "",
      is_featured: data.is_featured,
      is_active: data.is_active,
    });
  }, [vehicleResponse]);

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [pendingPreviews]);

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "name" && typeof value === "string" && !vehicleId) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const buildPayload = (): CreateVehiclePayload => ({
    brand_id: Number(form.brand_id),
    category_id: Number(form.category_id),
    status_slug: form.status_slug,
    transmission_type_slug: form.transmission_type_slug,
    fuel_type_slug: form.fuel_type_slug,
    name: form.name,
    slug: form.slug,
    model: form.model,
    year: Number(form.year),
    plate_number: form.plate_number,
    mileage: Number(form.mileage),
    seats: Number(form.seats),
    doors: Number(form.doors),
    daily_price: Number(form.daily_price),
    weekly_price: form.weekly_price ? Number(form.weekly_price) : null,
    monthly_price: form.monthly_price ? Number(form.monthly_price) : null,
    deposit_amount: Number(form.deposit_amount),
    description: form.description || null,
    is_featured: form.is_featured,
    is_active: form.is_active,
  });

  const validateStepOne = (): boolean => {
    const required: (keyof typeof form)[] = [
      "name",
      "model",
      "plate_number",
      "brand_id",
      "category_id",
      "daily_price",
      "deposit_amount",
    ];
    const mapped: Record<string, string> = {};

    for (const key of required) {
      if (!String(form[key]).trim()) {
        mapped[key] = "This field is required.";
      }
    }

    setFieldErrors(mapped);
    if (Object.keys(mapped).length > 0) {
      setError("Complete the required fields before continuing.");
      return false;
    }

    setError(null);
    return true;
  };

  const goToStepTwo = () => {
    if (validateStepOne()) setStep(2);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      goToStepTwo();
      return;
    }

    setError(null);
    setFieldErrors({});
    setSaving(true);

    try {
      const payload = buildPayload();

      if (vehicleId) {
        await updateMutation.mutateAsync(payload);
        if (pendingPhotos.length > 0) {
          await uploadVehiclePhotos(vehicleId, pendingPhotos, {
            is_primary: (vehicleResponse?.data.photos?.length ?? 0) === 0,
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(vehicleId) });
        }
        router.push("/vehicles");
      } else {
        const response = await createVehicle(payload);
        if (pendingPhotos.length > 0) {
          await uploadVehiclePhotos(response.data.id, pendingPhotos, { is_primary: true });
        }
        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        router.push("/vehicles");
      }
    } catch (err) {
      const body = err instanceof ApiError ? err.body : err;
      if (isValidationError(body)) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(body.errors)) {
          mapped[key] = messages[0];
        }
        setFieldErrors(mapped);
        setStep(1);
        setError("Please correct the validation errors on step 1.");
      } else {
        setError(err instanceof ApiError ? err.message : "Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  const loadError =
    lookupsError instanceof ApiError
      ? lookupsError.message
      : vehicleError instanceof ApiError
        ? vehicleError.message
        : lookupsError || vehicleError
          ? "Failed to load form data."
          : null;

  const selectedBrand = lookups?.vehicle_brands.find(
    (brand) => String(brand.id) === form.brand_id,
  );

  if (vehicleId && vehicleLoading) {
    return <div className="admin-card p-6 text-sm text-gray-500">Loading form...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-4">
        <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          {STEP_LABELS.map((label, index) => {
            const number = index + 1;
            const active = step === number;
            const done = step > number;

            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    active
                      ? "bg-[#3563E9] text-white"
                      : done
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {number}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}>
                    Step {number}
                  </p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="admin-card space-y-6 p-6">
        {loadError ? <ErrorMessage message={loadError} /> : null}
        {error ? <ErrorMessage message={error} /> : null}

        {step === 1 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["name", "Name"],
                ["slug", "Slug"],
                ["model", "Model"],
                ["plate_number", "Plate number"],
              ].map(([key, label]) => (
                <AdminFormField key={key} label={label}>
                  <input
                    value={form[key as keyof typeof form] as string}
                    onChange={(event) => setField(key as keyof typeof form, event.target.value)}
                    className="admin-input"
                    required={key !== "slug"}
                  />
                  {fieldErrors[key] ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors[key]}</p>
                  ) : null}
                </AdminFormField>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <AdminFormField label="Brand">
                <div className="flex items-center gap-3">
                  {selectedBrand ? (
                    <AdminImageThumb
                      src={selectedBrand.image_path ? storageUrl(selectedBrand.image_path) : null}
                      alt={selectedBrand.name}
                      size="sm"
                      fit="contain"
                      emptyLabel="Logo"
                    />
                  ) : null}
                  <select
                    value={form.brand_id}
                    onChange={(event) => setField("brand_id", event.target.value)}
                    className="admin-input min-w-0 flex-1"
                    required
                  >
                    <option value="">Select brand</option>
                    {lookups?.vehicle_brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.brand_id ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.brand_id}</p>
                ) : null}
              </AdminFormField>

              <AdminFormField label="Category">
                <select
                  value={form.category_id}
                  onChange={(event) => setField("category_id", event.target.value)}
                  className="admin-input"
                  required
                >
                  <option value="">Select category</option>
                  {lookups?.vehicle_categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.category_id ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.category_id}</p>
                ) : null}
              </AdminFormField>

              {(
                [
                  ["status_slug", "Status", lookups?.vehicle_statuses ?? []],
                  ["transmission_type_slug", "Transmission", lookups?.transmission_types ?? []],
                  ["fuel_type_slug", "Fuel type", lookups?.fuel_types ?? []],
                ] as const
              ).map(([key, label, options]) => (
                <AdminFormField key={key} label={label}>
                  <select
                    value={form[key]}
                    onChange={(event) => setField(key, event.target.value)}
                    className="admin-input"
                  >
                    {options.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </AdminFormField>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["year", "Year"],
                ["mileage", "Mileage"],
                ["seats", "Seats"],
                ["doors", "Doors"],
                ["daily_price", "Daily price"],
                ["weekly_price", "Weekly price"],
                ["monthly_price", "Monthly price"],
                ["deposit_amount", "Deposit"],
              ].map(([key, label]) => (
                <AdminFormField key={key} label={label}>
                  <input
                    type="number"
                    value={form[key as keyof typeof form] as string}
                    onChange={(event) => setField(key as keyof typeof form, event.target.value)}
                    className="admin-input"
                    required={!["weekly_price", "monthly_price"].includes(key)}
                  />
                  {fieldErrors[key] ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors[key]}</p>
                  ) : null}
                </AdminFormField>
              ))}
            </div>
          </>
        ) : (
          <>
            <VehiclePhotoManager
              vehicleId={vehicleId}
              photos={vehicleResponse?.data.photos ?? []}
              pendingPhotos={pendingPhotos}
              pendingPreviews={pendingPreviews}
              onPendingChange={(files, previews) => {
                setPendingPhotos(files);
                setPendingPreviews(previews);
              }}
              mode={vehicleId ? "edit" : "create"}
            />

            <AdminFormField label="Description">
              <textarea
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                className="admin-input min-h-24"
              />
            </AdminFormField>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => setField("is_featured", event.target.checked)}
                />
                Featured on homepage
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setField("is_active", event.target.checked)}
                />
                Active
              </label>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          {step === 2 ? (
            <button type="button" className="admin-btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
          ) : null}
          <button type="submit" disabled={saving} className="admin-btn-primary">
            {saving
              ? "Saving..."
              : step === 1
                ? "Next: Photos"
                : vehicleId
                  ? "Save vehicle"
                  : "Create vehicle"}
          </button>
          <button type="button" className="admin-btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
