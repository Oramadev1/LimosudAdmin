"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { getPendingAlerts } from "@/lib/api/admin";
import { useAuthReady } from "@/lib/auth/use-auth-ready";
import { useAdminQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";

export function AlertBellButton() {
  const authReady = useAuthReady();
  const { data } = useAdminQuery({
    queryKey: queryKeys.pendingAlerts(1),
    queryFn: () => getPendingAlerts(1),
    refetchInterval: authReady ? 30_000 : false,
  });

  const count = data?.meta.total ?? data?.data.length ?? 0;

  return (
    <Link
      href="/alerts"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-[#3563E9]/30 hover:text-[#3563E9]"
      aria-label={count > 0 ? `Alerts, ${count} pending` : "Alerts"}
    >
      <Bell size={20} />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3563E9] px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
