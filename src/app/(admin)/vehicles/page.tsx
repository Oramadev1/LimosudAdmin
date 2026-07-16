"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { AdminImageThumb } from "@/components/ui/AdminImageThumb";
import { VehicleStatusSelect } from "@/components/vehicles/VehicleStatusSelect";
import { VehicleHomepageRankSelect } from "@/components/vehicles/VehicleHomepageRankSelect";
import { useAuth } from "@/contexts/AuthContext";
import { deleteVehicle, getVehicles, updateVehicle } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { getVehiclePrimaryPhotoUrl } from "@/lib/images";
import { useLookupsQuery, usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import {
  EmptyState,
  ErrorMessage,
  PageHeader,
  Pagination,
} from "@/components/ui/AdminUi";

export default function VehiclesPageClient() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdateVehicles = hasPermission("vehicles.update");
  const { data: lookups } = useLookupsQuery();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const { data, isPending, isFetching, error } = usePaginatedQuery(
    queryKeys.vehicles(page),
    () => getVehicles(page),
  );

  const deleteMutation = useLockedMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const statusMutation = useLockedMutation({
    mutationFn: ({ id, status_slug }: { id: number; status_slug: string }) =>
      updateVehicle(id, { status_slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const homepageRankMutation = useLockedMutation({
    mutationFn: ({ id, homepage_rank }: { id: number; homepage_rank: number | null }) =>
      updateVehicle(id, { homepage_rank }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const handleStatusChange = async (vehicleId: number, statusSlug: string) => {
    try {
      await statusMutation.mutateAsync({ id: vehicleId, status_slug: statusSlug });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update vehicle status.");
      throw err;
    }
  };

  const handleHomepageRankChange = async (vehicleId: number, homepageRank: number | null) => {
    try {
      await homepageRankMutation.mutateAsync({ id: vehicleId, homepage_rank: homepageRank });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update homepage position.");
      throw err;
    }
  };

  const vehicles = data?.data ?? [];
  const lastPage = data?.meta.last_page ?? 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (vehicle) =>
        vehicle.name.toLowerCase().includes(q) ||
        vehicle.plate_number.toLowerCase().includes(q) ||
        vehicle.slug.toLowerCase().includes(q),
    );
  }, [vehicles, query]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this vehicle?")) return;

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Delete failed.");
    }
  };

  const errorMessage =
    error instanceof ApiError ? error.message : error ? "Failed to load vehicles." : null;

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Manage your fleet, photos, and pricing."
        actionHref="/vehicles/new"
        actionLabel="Add vehicle"
      />

      <div className="admin-card mb-4 p-4">
        <input
          type="search"
          placeholder="Search by name, slug, or plate..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="admin-input"
        />
      </div>

      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading vehicles...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No vehicles yet"
          description="Add your first vehicle in two steps: details, then photos."
        />
      ) : (
        <div className={`admin-card overflow-x-auto ${isFetching ? "opacity-80" : ""}`}>
          <table className="admin-table w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Plate</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Home #</th>
                <th className="px-4 py-3 text-left">Daily price</th>
                <th className="px-4 py-3 text-left">Active</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vehicle) => {
                const photoUrl = getVehiclePrimaryPhotoUrl(vehicle);
                const photoCount = vehicle.photos?.length ?? 0;

                return (
                  <tr key={vehicle.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <AdminImageThumb
                          src={photoUrl}
                          alt={vehicle.name}
                          size="xl"
                          fit="contain"
                          emptyLabel="No photo"
                        />
                        <div>
                          <div className="font-semibold text-gray-900">{vehicle.name}</div>
                          <div className="text-xs text-gray-400">
                            {vehicle.brand.name} · {vehicle.category.name}
                          </div>
                          {photoCount > 0 ? (
                            <div className="mt-1 text-xs text-gray-400">
                              {photoCount} photo{photoCount === 1 ? "" : "s"}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{vehicle.plate_number}</td>
                    <td className="px-4 py-3">
                      {canUpdateVehicles ? (
                        <VehicleStatusSelect
                          vehicleId={vehicle.id}
                          currentSlug={vehicle.status.slug}
                          currentName={vehicle.status.name}
                          statuses={lookups?.vehicle_statuses ?? []}
                          onChange={handleStatusChange}
                        />
                      ) : (
                        vehicle.status.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {canUpdateVehicles ? (
                        <VehicleHomepageRankSelect
                          vehicleId={vehicle.id}
                          currentRank={vehicle.homepage_rank}
                          onChange={handleHomepageRankChange}
                        />
                      ) : (
                        (vehicle.homepage_rank ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(vehicle.daily_price)}</td>
                    <td className="px-4 py-3">{vehicle.is_active ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/vehicles/${vehicle.id}/edit`}
                          className="text-[#3563E9] hover:underline"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/vehicles/${vehicle.id}/calendar`}
                          className="text-[#3563E9] hover:underline"
                        >
                          Calendar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
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
    </div>
  );
}
