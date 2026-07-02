"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CreditCard,
  LogOut,
  Mail,
  LayoutDashboard,
  MapPin,
  Receipt,
  Tags,
  UserCircle,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { siteConfig } from "@/config/site";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { useAuth } from "@/contexts/AuthContext";

const navSections = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
    ],
  },
  {
    title: "Fleet",
    items: [
      { href: "/vehicles", label: "Vehicles", icon: Car, permission: "vehicles.view" },
      { href: "/locations", label: "Locations", icon: MapPin, permission: "locations.view" },
      { href: "/vehicle-brands", label: "Brands", icon: Tags, permission: "vehicle_brands.view" },
      { href: "/vehicle-categories", label: "Categories", icon: Tags, permission: "vehicle_categories.view" },
      { href: "/maintenances", label: "Maintenance", icon: Wrench, permission: "maintenance.view" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/customers", label: "Customers", icon: Users, permission: "customers.view" },
      { href: "/contact-messages", label: "Contact", icon: Mail, permission: "contact_messages.view" },
      { href: "/reservations", label: "Reservations", icon: CalendarDays, permission: "reservations.view" },
      { href: "/payments", label: "Payments", icon: CreditCard, permission: "payments.view" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/expenses", label: "Expenses", icon: Receipt, permission: "expenses.view" },
      { href: "/alerts", label: "Alerts", icon: AlertTriangle, permission: "alerts.view" },
    ],
  },
] as const;

function getInitials(name?: string | null) {
  if (!name?.trim()) {
    return "?";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const { runOnce, busy: loggingOut } = useSubmitLock();

  const canViewItem = (permission: string) =>
    user?.roles.some((role) => role.slug === "super_admin") || hasPermission(permission);

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canViewItem(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="admin-sidebar flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-5">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">
            {siteConfig.brand}
          </p>
          <p className="mt-1 text-[11px] font-medium tracking-[0.18em] text-slate-500 uppercase">
            Admin panel
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav className="admin-sidebar-nav flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-500 uppercase">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          active
                            ? "bg-[#3563E9] text-white shadow-lg shadow-blue-950/30"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            active
                              ? "bg-white/15 text-white"
                              : "bg-white/5 text-slate-400 group-hover:bg-white/8 group-hover:text-slate-200"
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.25} />
                        </span>
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-white/8 p-3">
        <Link
          href="/profile"
          onClick={onClose}
          className={`mb-2 flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
            pathname === "/profile"
              ? "bg-white/8 text-white"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3563E9]/20 text-sm font-semibold text-blue-200">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <UserCircle
            size={18}
            className={pathname === "/profile" ? "text-blue-300" : "text-slate-500"}
          />
        </Link>

        <button
          type="button"
          disabled={loggingOut}
          onClick={() => void runOnce(() => logout())}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:cursor-wait disabled:opacity-70"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
            <LogOut size={16} />
          </span>
          Log out
        </button>
      </div>
    </aside>
  );
}
