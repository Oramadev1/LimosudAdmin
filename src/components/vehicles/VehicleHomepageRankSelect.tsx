"use client";

import { useEffect, useRef, useState } from "react";

type VehicleHomepageRankSelectProps = {
  vehicleId: number;
  currentRank: number | null;
  disabled?: boolean;
  onChange: (vehicleId: number, homepageRank: number | null) => Promise<void>;
};

export function VehicleHomepageRankSelect({
  vehicleId,
  currentRank,
  disabled = false,
  onChange,
}: VehicleHomepageRankSelectProps) {
  const [rank, setRank] = useState(currentRank);
  const [saving, setSaving] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setRank(currentRank);
  }, [currentRank]);

  const handleChange = async (value: string) => {
    const nextRank = value === "" ? null : Number(value);
    if (nextRank === rank || saving || disabled || inFlightRef.current) {
      return;
    }

    const previous = rank;
    inFlightRef.current = true;
    setRank(nextRank);
    setSaving(true);

    try {
      await onChange(vehicleId, nextRank);
    } catch {
      setRank(previous);
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <select
      value={rank ?? ""}
      disabled={disabled || saving}
      onChange={(event) => void handleChange(event.target.value)}
      aria-label={`Change homepage position for vehicle ${vehicleId}`}
      className="min-w-[5.5rem] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition focus:ring-2 focus:ring-[#3563E9]/30 disabled:cursor-wait disabled:opacity-70"
    >
      <option value="">—</option>
      {[1, 2, 3, 4, 5, 6].map((position) => (
        <option key={position} value={position}>
          {position}
        </option>
      ))}
    </select>
  );
}
