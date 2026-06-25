"use client";

import { useEffect, useRef, useState } from "react";

import type { LookupRef } from "@/types/api";

function statusSelectClass(slug: string): string {
  switch (slug) {
    case "rented":
      return "border-red-200 bg-red-50 text-red-800";
    case "reserved":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "maintenance":
    case "repair":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "out_of_service":
      return "border-gray-200 bg-gray-100 text-gray-600";
    case "available":
    default:
      return "border-green-200 bg-green-50 text-green-800";
  }
}

type VehicleStatusSelectProps = {
  vehicleId: number;
  currentSlug: string;
  currentName: string;
  statuses: LookupRef[];
  disabled?: boolean;
  onChange: (vehicleId: number, statusSlug: string) => Promise<void>;
};

export function VehicleStatusSelect({
  vehicleId,
  currentSlug,
  currentName,
  statuses,
  disabled = false,
  onChange,
}: VehicleStatusSelectProps) {
  const [slug, setSlug] = useState(currentSlug);
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setSlug(currentSlug);
  }, [currentSlug]);

  const handleChange = async (nextSlug: string) => {
    if (nextSlug === slug || saving || disabled || inFlightRef.current) return;

    const previous = slug;
    inFlightRef.current = true;
    setSlug(nextSlug);
    setSaving(true);

    try {
      await onChange(vehicleId, nextSlug);
    } catch {
      setSlug(previous);
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  if (statuses.length === 0) {
    return <span className="text-sm text-gray-700">{currentName}</span>;
  }

  return (
    <select
      value={slug}
      disabled={disabled || saving}
      onChange={(event) => void handleChange(event.target.value)}
      aria-label={`Change status for vehicle ${vehicleId}`}
      className={`min-w-[9.5rem] rounded-lg border px-2.5 py-1.5 text-sm font-medium outline-none transition focus:ring-2 focus:ring-[#3563E9]/30 disabled:cursor-wait disabled:opacity-70 ${statusSelectClass(slug)}`}
    >
      {statuses.map((status) => (
        <option key={status.slug} value={status.slug}>
          {status.name}
        </option>
      ))}
    </select>
  );
}
