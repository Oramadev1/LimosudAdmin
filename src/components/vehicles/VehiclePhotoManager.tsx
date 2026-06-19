"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  deleteVehiclePhoto,
  updateVehiclePhoto,
  uploadVehiclePhotos,
} from "@/lib/api/admin";
import { storageUrl } from "@/lib/images";
import { queryKeys } from "@/lib/query/keys";
import type { VehiclePhoto } from "@/types/api";
import { ErrorMessage } from "@/components/ui/AdminUi";

type VehiclePhotoManagerProps = {
  vehicleId?: number;
  photos: VehiclePhoto[];
  pendingPhotos?: File[];
  pendingPreviews?: string[];
  onPendingChange?: (files: File[], previews: string[]) => void;
  mode: "create" | "edit";
};

export function VehiclePhotoManager({
  vehicleId,
  photos,
  pendingPhotos: controlledPendingPhotos,
  pendingPreviews: controlledPendingPreviews,
  onPendingChange,
  mode,
}: VehiclePhotoManagerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPendingPhotos, setLocalPendingPhotos] = useState<File[]>([]);
  const [localPendingPreviews, setLocalPendingPreviews] = useState<string[]>([]);

  const pendingPhotos = controlledPendingPhotos ?? localPendingPhotos;
  const pendingPreviews = controlledPendingPreviews ?? localPendingPreviews;

  const setPending = (files: File[], previews: string[]) => {
    if (onPendingChange) {
      onPendingChange(files, previews);
      return;
    }
    setLocalPendingPhotos(files);
    setLocalPendingPreviews(previews);
  };

  useEffect(() => {
    return () => {
      localPendingPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [localPendingPreviews]);

  const invalidate = () => {
    if (vehicleId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(vehicleId) });
    }
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };

  const uploadMutation = useLockedMutation({
    mutationFn: (files: File[]) =>
      uploadVehiclePhotos(vehicleId!, files, {
        is_primary: photos.length === 0 && pendingPhotos.length === files.length,
      }),
    onSuccess: () => {
      invalidate();
      setPending([], []);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const primaryMutation = useLockedMutation({
    mutationFn: (photoId: number) => updateVehiclePhoto(photoId, { is_primary: true }),
    onSuccess: invalidate,
  });

  const deleteMutation = useLockedMutation({
    mutationFn: deleteVehiclePhoto,
    onSuccess: invalidate,
  });

  const handleSelectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    if (selected.length === 0) return;

    const nextFiles = [...pendingPhotos, ...selected];
    const nextPreviews = [
      ...pendingPreviews,
      ...selected.map((file) => URL.createObjectURL(file)),
    ];
    setPending(nextFiles, nextPreviews);
    event.target.value = "";
  };

  const removePending = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPending(
      pendingPhotos.filter((_, i) => i !== index),
      pendingPreviews.filter((_, i) => i !== index),
    );
  };

  const uploadPending = async () => {
    if (!vehicleId || pendingPhotos.length === 0) return;
    setError(null);
    try {
      await uploadMutation.mutateAsync(pendingPhotos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const sortedPhotos = photos.slice().sort((a, b) => a.sort_order - b.sort_order);
  const hasGallery = sortedPhotos.length > 0 || pendingPreviews.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "create"
            ? "Add vehicle photos. The first photo becomes the main listing image."
            : "Add or manage photos. One photo is marked as primary for listings."}
        </p>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      <label className="group block cursor-pointer">
        <div className="flex items-center justify-center rounded-[8px] border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center transition-colors group-hover:border-[#3563E9] group-hover:bg-blue-50/40">
          <div>
            <p className="text-sm font-medium text-gray-700">Click to select photos</p>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG, or WEBP · select multiple</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelectFiles}
          className="sr-only"
        />
      </label>

      {hasGallery ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {sortedPhotos.map((photo) => (
            <div key={photo.id} className="rounded-[8px] border border-gray-100 p-2">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] bg-gray-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(photo.path)}
                  alt={photo.alt_text ?? "Vehicle photo"}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {photo.is_primary ? (
                  <span className="rounded bg-[#3563E9]/10 px-2 py-1 font-semibold text-[#3563E9]">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-[#3563E9] hover:underline"
                    onClick={() => primaryMutation.mutate(photo.id)}
                  >
                    Set primary
                  </button>
                )}
                <button
                  type="button"
                  className="font-semibold text-red-500 hover:underline"
                  onClick={async () => {
                    if (!confirm("Delete this photo?")) return;
                    await deleteMutation.mutateAsync(photo.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {pendingPreviews.map((preview, index) => (
            <div key={preview} className="rounded-[8px] border border-dashed border-[#3563E9]/40 p-2">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[8px] bg-gray-50 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`New photo ${index + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                  {mode === "create"
                    ? index === 0 && sortedPhotos.length === 0
                      ? "Primary"
                      : "New"
                    : "New"}
                </span>
                <button
                  type="button"
                  className="font-semibold text-gray-500 hover:underline"
                  onClick={() => removePending(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No photos yet.</p>
      )}

      {mode === "edit" && vehicleId && pendingPhotos.length > 0 ? (
        <button
          type="button"
          disabled={uploadMutation.isPending}
          onClick={uploadPending}
          className="admin-btn-primary"
        >
          {uploadMutation.isPending
            ? "Uploading..."
            : `Upload ${pendingPhotos.length} new photo${pendingPhotos.length === 1 ? "" : "s"}`}
        </button>
      ) : null}
    </div>
  );
}
