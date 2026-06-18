"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MapPin,
  Tags,
  Users,
  Wrench,
  Receipt,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { siteConfig } from "@/config/site";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/vehicles", label: "Vehicles", icon: Car, permission: "vehicles.view" },
  { href: "/locations", label: "Locations", icon: MapPin, permission: "locations.view" },
  { href: "/vehicle-brands", label: "Brands", icon: Tags, permission: "vehicle_brands.view" },
  { href: "/vehicle-categories", label: "Categories", icon: Tags, permission: "vehicle_categories.view" },
  { href: "/customers", label: "Customers", icon: Users, permission: "customers.view" },
  { href: "/reservations", label: "Reservations", icon: CalendarDays, permission: "reservations.view" },
  { href: "/payments", label: "Payments", icon: CreditCard, permission: "payments.view" },
  { href: "/maintenances", label: "Maintenance", icon: Wrench, permission: "maintenance.view" },
  { href: "/expenses", label: "Expenses", icon: Receipt, permission: "expenses.view" },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle, permission: "alerts.view" },
];

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  return (
    <aside className="flex min-h-screen w-[260px] shrink-0 flex-col justify-between border-r border-gray-100 bg-white px-5 py-8">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between px-1">
          <div>
            <Link
              href="/dashboard"
              onClick={onClose}
              className="text-xl font-bold tracking-wide text-[#3563E9]"
            >
              {siteConfig.brand}
            </Link>
            <p className="mt-1 text-xs text-gray-400">Admin panel</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 lg:hidden"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div>
          <p className="mb-3 px-1 text-xs font-semibold tracking-widest text-gray-300 uppercase">
            Main Menu
          </p>
          <ul className="flex flex-col gap-1">
            {menuItems
              .filter(
                (item) =>
                  user?.roles.some((role) => role.slug === "super_admin") ||
                  hasPermission(item.permission),
              )
              .map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-[8px] px-4 py-3 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[#3563E9] text-white"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon size={18} />
                      {label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <div className="px-1">
          <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
          <p className="truncate text-xs text-gray-400">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
