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
        className={`fixed inset-y-0 left-0 z-40 h-screen w-[260px] bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-bold text-[#3563E9]">{siteConfig.brand}</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
