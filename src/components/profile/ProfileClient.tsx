"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { updateProfile } from "@/lib/api/auth";
import { ApiError, isValidationError } from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UpdateProfilePayload } from "@/types/api";
import { AdminFormField, ErrorMessage, PageHeader } from "@/components/ui/AdminUi";

export function ProfileClient() {
  const { user, updateUser, hasPermission } = useAuth();
  const canManageTeam =
    user?.roles.some((role) => role.slug === "super_admin") ||
    hasPermission("users.view") ||
    hasPermission("permissions.assign");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? "",
    });
  }, [user]);

  const profileMutation = useLockedMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (response) => {
      updateUser(response.data);
      setProfileSuccess("Profile updated successfully.");
      setProfileError(null);
    },
  });

  const passwordMutation = useLockedMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (response) => {
      updateUser(response.data);
      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      setPasswordSuccess("Password updated successfully.");
      setPasswordError(null);
    },
  });

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await profileMutation.mutateAsync({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone || null,
      });
    } catch (error) {
      const body = error instanceof ApiError ? error.body : error;
      setProfileError(
        isValidationError(body) ? body.message : error instanceof ApiError ? error.message : "Save failed.",
      );
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      await passwordMutation.mutateAsync({
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
    } catch (error) {
      const body = error instanceof ApiError ? error.body : error;
      setPasswordError(
        isValidationError(body)
          ? body.message
          : error instanceof ApiError
            ? error.message
            : "Password update failed.",
      );
    }
  };

  if (!user) {
    return <div className="admin-card p-6 text-sm text-gray-500">Loading profile...</div>;
  }

  return (
    <div>
      <PageHeader
        title="My profile"
        description="View and update your account details."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <form onSubmit={handleProfileSubmit} className="admin-card space-y-4 p-6">
          <h2 className="text-lg font-bold text-gray-900">Account details</h2>

          {profileError ? <ErrorMessage message={profileError} /> : null}
          {profileSuccess ? (
            <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              {profileSuccess}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Full name">
              <input
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, name: event.target.value }))
                }
                className="admin-input"
                required
              />
            </AdminFormField>

            <AdminFormField label="Phone">
              <input
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="admin-input"
                placeholder="06 00 00 00 00"
              />
            </AdminFormField>

            <div className="md:col-span-2">
              <AdminFormField label="Email">
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="admin-input"
                  required
                />
              </AdminFormField>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={profileMutation.isPending} className="admin-btn-primary">
              {profileMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>

        <aside className="admin-card space-y-4 p-6">
          <h2 className="text-lg font-bold text-gray-900">Account info</h2>

          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Status</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {user.is_active ? "Active" : "Inactive"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Roles</p>
            <ul className="mt-2 space-y-1">
              {user.roles.map((role) => (
                <li
                  key={role.id}
                  className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#3563E9]"
                >
                  {role.name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Permissions</p>
            <p className="mt-1 text-sm text-gray-600">
              {user.permissions.length} permission{user.permissions.length === 1 ? "" : "s"} active
            </p>
          </div>

          {canManageTeam ? (
            <Link
              href="/users"
              className="inline-flex items-center gap-2 rounded-lg border border-[#3563E9]/20 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#3563E9] transition hover:bg-blue-100"
            >
              <Shield size={16} />
              Manage team & permissions
            </Link>
          ) : null}
        </aside>
      </div>

      <form onSubmit={handlePasswordSubmit} className="admin-card mt-6 space-y-4 p-6">
        <h2 className="text-lg font-bold text-gray-900">Change password</h2>
        <p className="text-sm text-gray-500">
          Leave blank if you do not want to change your password.
        </p>

        {passwordError ? <ErrorMessage message={passwordError} /> : null}
        {passwordSuccess ? (
          <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {passwordSuccess}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminFormField label="Current password">
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  current_password: event.target.value,
                }))
              }
              className="admin-input"
              autoComplete="current-password"
            />
          </AdminFormField>

          <AdminFormField label="New password">
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) =>
                setPasswordForm((current) => ({ ...current, password: event.target.value }))
              }
              className="admin-input"
              autoComplete="new-password"
              minLength={8}
            />
          </AdminFormField>

          <AdminFormField label="Confirm new password">
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(event) =>
                setPasswordForm((current) => ({
                  ...current,
                  password_confirmation: event.target.value,
                }))
              }
              className="admin-input"
              autoComplete="new-password"
              minLength={8}
            />
          </AdminFormField>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={
              passwordMutation.isPending ||
              !passwordForm.current_password ||
              !passwordForm.password ||
              !passwordForm.password_confirmation
            }
            className="admin-btn-secondary"
          >
            {passwordMutation.isPending ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
