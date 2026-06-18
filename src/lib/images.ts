import { siteConfig } from "@/config/site";
import type { Vehicle, VehiclePhoto } from "@/types/api";

export function getStorageBaseUrl(): string {
  return siteConfig.apiUrl.replace(/\/api\/?$/, "");
}

export function storageUrl(path: string): string {
  return `${getStorageBaseUrl()}/storage/${path}`;
}

export function getPrimaryPhoto(photos: VehiclePhoto[] | undefined): VehiclePhoto | null {
  if (!photos?.length) return null;
  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  return sorted.find((photo) => photo.is_primary) ?? sorted[0];
}

export function getVehiclePrimaryPhotoUrl(vehicle: Pick<Vehicle, "photos">): string | null {
  const photo = getPrimaryPhoto(vehicle.photos);
  return photo ? storageUrl(photo.path) : null;
}
