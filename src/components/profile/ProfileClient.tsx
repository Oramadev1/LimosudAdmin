"use client";

import { FormEvent, useEffect, useState } from "react";
// import { Shield } from "lucide-react";
import { useLockedMutation } from "@/lib/use-locked-mutation";

import { updateProfile } from "@/lib/api/auth";
import { useAdminFormErrors } from "@/lib/use-admin-form-errors";
import { useAuth } from "@/contexts/AuthContext";
import type { UpdateProfilePayload } from "@/types/api";
import {
  AdminFormField,
  FormGlobalError,
  inputErrorClass,
  PageHeader,
} from "@/components/ui/AdminUi";

export function ProfileClient() {
  const { user, updateUser } = useAuth();
  const {
    globalError: profileGlobalError,
    fieldErrors: profileFieldErrors,
    resetErrors: resetProfileErrors,
    applySubmissionError: applyProfileSubmissionError,
    clearFieldError: clearProfileFieldError,
  } = useAdminFormErrors();
  const {
    globalError: passwordGlobalError,
    fieldErrors: passwordFieldErrors,
    resetErrors: resetPasswordErrors,
    applySubmissionError: applyPasswordSubmissionError,
    clearFieldError: clearPasswordFieldError,
  } = useAdminFormErrors();
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
      resetProfileErrors();
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
      resetPasswordErrors();
    },
  });

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetProfileErrors();
    setProfileSuccess(null);

    try {
      await profileMutation.mutateAsync({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone || null,
      });
    } catch (error) {
      applyProfileSubmissionError(error, "Save failed.");
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    resetPasswordErrors();
    setPasswordSuccess(null);

    try {
      await passwordMutation.mutateAsync({
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
    } catch (error) {
      applyPasswordSubmissionError(error, "Password update failed.");
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

      <form onSubmit={handleProfileSubmit} className="admin-card space-y-4 p-6">
          <h2 className="text-lg font-bold text-gray-900">Account details</h2>

          <FormGlobalError message={profileGlobalError} />
          {profileSuccess ? (
            <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
              {profileSuccess}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Full name" error={profileFieldErrors.name}>
              <input
                value={profileForm.name}
                onChange={(event) => {
                  setProfileForm((current) => ({ ...current, name: event.target.value }));
                  clearProfileFieldError("name");
                }}
                className={`admin-input ${inputErrorClass(profileFieldErrors.name)}`}
                required
              />
            </AdminFormField>

            <AdminFormField label="Phone" error={profileFieldErrors.phone}>
              <input
                value={profileForm.phone}
                onChange={(event) => {
                  setProfileForm((current) => ({ ...current, phone: event.target.value }));
                  clearProfileFieldError("phone");
                }}
                className={`admin-input ${inputErrorClass(profileFieldErrors.phone)}`}
                placeholder="06 00 00 00 00"
              />
            </AdminFormField>

            <div className="md:col-span-2">
              <AdminFormField label="Email" error={profileFieldErrors.email}>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => {
                    setProfileForm((current) => ({ ...current, email: event.target.value }));
                    clearProfileFieldError("email");
                  }}
                  className={`admin-input ${inputErrorClass(profileFieldErrors.email)}`}
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

      <form onSubmit={handlePasswordSubmit} className="admin-card mt-6 space-y-4 p-6">
        <h2 className="text-lg font-bold text-gray-900">Change password</h2>
        <p className="text-sm text-gray-500">
          Leave blank if you do not want to change your password.
        </p>

        <FormGlobalError message={passwordGlobalError} />
        {passwordSuccess ? (
          <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {passwordSuccess}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminFormField label="Current password" error={passwordFieldErrors.current_password}>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(event) => {
                setPasswordForm((current) => ({
                  ...current,
                  current_password: event.target.value,
                }));
                clearPasswordFieldError("current_password");
              }}
              className={`admin-input ${inputErrorClass(passwordFieldErrors.current_password)}`}
              autoComplete="current-password"
            />
          </AdminFormField>

          <AdminFormField label="New password" error={passwordFieldErrors.password}>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(event) => {
                setPasswordForm((current) => ({ ...current, password: event.target.value }));
                clearPasswordFieldError("password");
              }}
              className={`admin-input ${inputErrorClass(passwordFieldErrors.password)}`}
              autoComplete="new-password"
              minLength={8}
            />
          </AdminFormField>

          <AdminFormField label="Confirm new password" error={passwordFieldErrors.password_confirmation}>
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(event) => {
                setPasswordForm((current) => ({
                  ...current,
                  password_confirmation: event.target.value,
                }));
                clearPasswordFieldError("password_confirmation");
              }}
              className={`admin-input ${inputErrorClass(passwordFieldErrors.password_confirmation)}`}
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
