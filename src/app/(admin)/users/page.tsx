"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield } from "lucide-react";

import { getUsers } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { usePaginatedQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { EmptyState, ErrorMessage, PageHeader, Pagination } from "@/components/ui/AdminUi";

export default function UsersPage() {
  const [page, setPage] = useState(1);

  const { data, isPending, error } = usePaginatedQuery(
    queryKeys.users(page),
    () => getUsers(page),
  );

  return (
    <div>
      <PageHeader
        title="Team & permissions"
        description="Manage staff accounts, roles, and permissions."
      />

      {error ? (
        <ErrorMessage message={error instanceof ApiError ? error.message : "Failed to load users."} />
      ) : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading team...</div>
      ) : !data?.data.length ? (
        <EmptyState title="No users found" description="There are no staff accounts yet." />
      ) : (
        <div className="admin-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.roles.map((role) => role.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/users/${user.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#3563E9] hover:underline"
                    >
                      <Shield size={14} />
                      Manage access
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={data.meta.current_page}
            lastPage={data.meta.last_page}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
