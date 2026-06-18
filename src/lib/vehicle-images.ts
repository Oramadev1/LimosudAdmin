import type { Vehicle, VehiclePhoto } from "@/types/api";

import { storageUrl } from "./images";

export function getPrimaryPhoto(vehicle: Vehicle): VehiclePhoto | null {
  if (!vehicle.photos?.length) {
    return null;
  }

  const sorted = [...vehicle.photos].sort((a, b) => a.sort_order - b.sort_order);

  return sorted.find((photo) => photo.is_primary) ?? sorted[0];
}

export function getVehicleImageUrl(vehicle: Vehicle): string | null {
  const photo = getPrimaryPhoto(vehicle);

  return photo ? storageUrl(photo.path) : null;
}

export function getBrandImageUrl(imagePath: string | null | undefined): string | null {
  return imagePath ? storageUrl(imagePath) : null;
}
