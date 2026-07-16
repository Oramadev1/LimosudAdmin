"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { siteConfig } from "@/config/site";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-40 h-screen w-[272px] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{siteConfig.brand}</p>
            <p className="text-xs text-gray-400">Admin panel</p>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
