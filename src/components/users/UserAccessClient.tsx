"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import {
  getPermissions,
  getRoles,
  getUser,
  syncRolePermissions,
  syncUserPermissions,
  updateUser,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAdminQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import type { Permission } from "@/types/api";
import { AdminFormField, ErrorMessage, FormGlobalError, inputErrorClass, PageHeader } from "@/components/ui/AdminUi";
import { useAuth } from "@/contexts/AuthContext";

export function UserAccessClient({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canAssign = hasPermission("permissions.assign");
  const { globalError, fieldErrors, resetErrors, applySubmissionError, clearFieldError } =
    useAdminFormErrors();
  const [success, setSuccess] = useState<string | null>(null);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [roleEditorId, setRoleEditorId] = useState<number | null>(null);
  const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
    is_active: true,
  });

  const { data, isPending, error, dataUpdatedAt } = useAdminQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => getUser(id),
  });

  const { data: rolesData, dataUpdatedAt: rolesUpdatedAt } = useAdminQuery({
    queryKey: queryKeys.roles,
    queryFn: getRoles,
    enabled: canAssign,
  });

  const { data: permissionsData, dataUpdatedAt: permissionsUpdatedAt } = useAdminQuery({
    queryKey: queryKeys.permissions,
    queryFn: getPermissions,
    enabled: canAssign,
  });

  const roles = rolesData?.data ?? [];
  const permissions = permissionsData?.data ?? [];

  useEffect(() => {
    if (!data?.data) {
      return;
    }

    const user = data.data;
    setProfileForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
      is_active: user.is_active,
    });
    setRoleIds(user.roles.map((role) => role.id));

    if (!permissionsData?.data) {
      return;
    }

    setSelectedPermissionIds(
      permissionsData.data
        .filter((permission) => data.effective_permission_slugs.includes(permission.slug))
        .map((permission) => permission.id),
    );
  }, [id, dataUpdatedAt, permissionsUpdatedAt, permissionsData?.data]);

  useEffect(() => {
    if (!roleEditorId || !rolesData?.data) {
      return;
    }

    const role = rolesData.data.find((item) => item.id === roleEditorId);
    setRolePermissionIds(role?.permissions?.map((permission) => permission.id) ?? []);
  }, [roleEditorId, rolesUpdatedAt, rolesData?.data]);

  const permissionsByModule = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const module = permission.module ?? "other";
      groups[module] = groups[module] ? [...groups[module], permission] : [permission];
      return groups;
    }, {});
  }, [permissions]);

  const rolePermissionSlugs = useMemo(() => new Set(data?.role_permission_slugs ?? []), [data]);

  const saveProfileMutation = useLockedMutation({
    mutationFn: () =>
      updateUser(id, {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone || null,
        is_active: profileForm.is_active,
        role_ids: roleIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
      setSuccess("User profile updated.");
      resetErrors();
    },
  });

  const savePermissionsMutation = useLockedMutation({
    mutationFn: () =>
      syncUserPermissions(id, {
        permission_ids: selectedPermissionIds,
        role_ids: roleIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
      setSuccess("Permissions updated.");
      resetErrors();
    },
  });

  const saveRolePermissionsMutation = useLockedMutation({
    mutationFn: () => syncRolePermissions(roleEditorId!, rolePermissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(id) });
      setSuccess("Role permissions updated for all users with this role.");
      resetErrors();
    },
  });

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetErrors();
    setSuccess(null);

    try {
      await saveProfileMutation.mutateAsync();
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const handlePermissionsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetErrors();
    setSuccess(null);

    try {
      await savePermissionsMutation.mutateAsync();
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const handleRolePermissionsSave = async () => {
    resetErrors();
    setSuccess(null);

    try {
      await saveRolePermissionsMutation.mutateAsync();
    } catch (err) {
      applySubmissionError(err, "Save failed.");
    }
  };

  const togglePermission = (permission: Permission) => {
    const checked = selectedPermissionIds.includes(permission.id);

    if (checked) {
      setSelectedPermissionIds((current) => current.filter((value) => value !== permission.id));
      return;
    }

    setSelectedPermissionIds((current) => [...current, permission.id]);
  };

  if (isPending) {
    return <div className="admin-card p-6 text-sm text-gray-500">Loading user...</div>;
  }

  if (error || !data) {
    return (
      <ErrorMessage
        message={error instanceof ApiError ? error.message : "Failed to load user."}
      />
    );
  }

  const isSuperAdmin = data.data.roles.some((role) => role.slug === "super_admin");

  return (
    <div>
      <Link href="/users" className="admin-btn-secondary admin-btn-sm mb-4">
        ← Back to team
      </Link>

      <PageHeader
        title={data.data.name}
        description={`Manage roles and permissions for ${data.data.email}.`}
      />

      <FormGlobalError message={globalError} />
      {success ? (
        <p className="mb-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleProfileSubmit} className="admin-card mb-6 space-y-4 p-6">
        <h2 className="text-lg font-bold text-gray-900">Account</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField label="Name" error={fieldErrors.name}>
            <input
              className={`admin-input ${inputErrorClass(fieldErrors.name)}`}
              value={profileForm.name}
              onChange={(e) => {
                setProfileForm((c) => ({ ...c, name: e.target.value }));
                clearFieldError("name");
              }}
              required
            />
          </AdminFormField>
          <AdminFormField label="Email" error={fieldErrors.email}>
            <input
              type="email"
              className={`admin-input ${inputErrorClass(fieldErrors.email)}`}
              value={profileForm.email}
              onChange={(e) => {
                setProfileForm((c) => ({ ...c, email: e.target.value }));
                clearFieldError("email");
              }}
              required
            />
          </AdminFormField>
          <AdminFormField label="Phone" error={fieldErrors.phone}>
            <input
              className={`admin-input ${inputErrorClass(fieldErrors.phone)}`}
              value={profileForm.phone}
              onChange={(e) => {
                setProfileForm((c) => ({ ...c, phone: e.target.value }));
                clearFieldError("phone");
              }}
            />
          </AdminFormField>
          <AdminFormField label="Status">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={profileForm.is_active}
                onChange={(e) => setProfileForm((c) => ({ ...c, is_active: e.target.checked }))}
              />
              Active account
            </label>
          </AdminFormField>
        </div>

        {canAssign ? (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Roles</p>
            <div className="flex flex-wrap gap-3">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id)}
                    disabled={isSuperAdmin}
                    onChange={(e) => {
                      setRoleIds((current) =>
                        e.target.checked
                          ? [...current, role.id]
                          : current.filter((value) => value !== role.id),
                      );
                    }}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="submit" disabled={saveProfileMutation.isPending} className="admin-btn-primary">
            {saveProfileMutation.isPending ? "Saving..." : "Save account"}
          </button>
        </div>
      </form>

      {canAssign && !isSuperAdmin ? (
        <form onSubmit={handlePermissionsSubmit} className="admin-card space-y-4 p-6">
          <h2 className="text-lg font-bold text-gray-900">Permissions</h2>
          <p className="text-sm text-gray-500">
            Check permissions this user should have. Permissions from roles are marked. Extra
            permissions are saved directly on the user.
          </p>

          <div className="space-y-6">
            {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
              <div key={module}>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">
                  {module}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {modulePermissions.map((permission) => {
                    const fromRole = rolePermissionSlugs.has(permission.slug);
                    const checked = selectedPermissionIds.includes(permission.id);

                    return (
                      <label
                        key={permission.id}
                        className="flex items-start gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => togglePermission(permission)}
                        />
                        <span>
                          <span className="font-medium text-gray-900">{permission.name}</span>
                          <span className="mt-0.5 block text-xs text-gray-400">{permission.slug}</span>
                          {fromRole ? (
                            <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#3563E9]">
                              via role
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savePermissionsMutation.isPending}
              className="admin-btn-primary"
            >
              {savePermissionsMutation.isPending ? "Saving..." : "Save permissions"}
            </button>
          </div>
        </form>
      ) : null}

      {canAssign ? (
        <div className="admin-card mt-6 space-y-4 p-6">
          <h2 className="text-lg font-bold text-gray-900">Edit role permissions</h2>
          <p className="text-sm text-gray-500">
            Changes here apply to every user assigned to the selected role.
          </p>

          <AdminFormField label="Role">
            <select
              className="admin-input"
              value={roleEditorId ?? ""}
              onChange={(e) => {
                const nextRoleId = e.target.value ? Number(e.target.value) : null;
                setRoleEditorId(nextRoleId);

                if (!nextRoleId) {
                  setRolePermissionIds([]);
                  return;
                }

                const role = roles.find((item) => item.id === nextRoleId);
                setRolePermissionIds(role?.permissions?.map((permission) => permission.id) ?? []);
              }}
            >
              <option value="">Select a role</option>
              {roles
                .filter((role) => role.slug !== "super_admin")
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </AdminFormField>

          {roleEditorId ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={rolePermissionIds.includes(permission.id)}
                    onChange={(e) => {
                      setRolePermissionIds((current) =>
                        e.target.checked
                          ? [...current, permission.id]
                          : current.filter((value) => value !== permission.id),
                      );
                    }}
                  />
                  <span>{permission.name}</span>
                </label>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!roleEditorId || saveRolePermissionsMutation.isPending}
              onClick={() => void handleRolePermissionsSave()}
              className="admin-btn-secondary"
            >
              {saveRolePermissionsMutation.isPending ? "Saving..." : "Save role permissions"}
            </button>
          </div>
        </div>
      ) : null}

      {isSuperAdmin ? (
        <p className="admin-card mt-6 p-4 text-sm text-gray-500">
          Super Admin always has every permission and cannot be edited here.
        </p>
      ) : null}
    </div>
  );
}
